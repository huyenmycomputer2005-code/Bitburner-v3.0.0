const FLAGS: [string, string | number | boolean | string[]][] = [
  ["start", "home"],       // server bắt đầu scan
  ["run", false],          // nếu true thì copy & chạy payload khi root được server
  ["payload", "hack.ts"],  // tên file payload để copy/run
  ["threads", Infinity],   // threads tối đa cho payload mỗi server
  ["depth", Infinity],     // giới hạn depth (infinite nếu không truyền)
  ["excludeHome", true],   // có exclude 'home' (không nuke home) hay không
  ["payloadArgs", "--target {host} --percent 0.05"],     // args cho các script con
  ["verbose", false],      // in log chi tiết
  ["help", false],         // in help và exit
]

export async function main(ns: NS): Promise<void> {
  ns.disableLog('ALL')
  ns.ui.openTail()
  ns.clearLog()

  // --- Định nghĩa flags (sử dụng ns.flags) và cấu hình script ---
  const f = ns.flags(FLAGS);

  if (f.help) {
    // in help bằng tprint để hiện rõ cho user, đồng thời in vào log
    ns.tprint(help());
    ns.print("autoRoot: displayed help and exiting.");
    return;
  }

  // Chuẩn hoá payloadArgs: một chuỗi, ví dụ "--target {host} --percent 0.1"
  const rawPayloadArgs = String(f.payloadArgs || "").trim(); // chuỗi hoặc ""
  // Tách thành mảng theo space (đơn giản). Nếu cần args phức tạp có quotes, có thể write parser.
  const globalPayloadArgTokens = rawPayloadArgs.length > 0 ? rawPayloadArgs.split(/\s+/) : [];

  // Một chút normalize (ns.flags có thể parse số, boolean; đảm bảo depth là number hoặc Infinity)
  let maxDepth: number;
  if (f.depth === Infinity || f.depth === "Infinity") maxDepth = Infinity;
  else maxDepth = Number(f.depth) || Infinity;

  const startHost: string = String(f.start || "home");
  const runPayload: boolean = Boolean(f.run);
  const payload: string = String(f.payload || "hack.js");
  const payloadThreads: number = Math.max(0, Math.floor(Number(f.threads) || 1));
  const excludeHome: boolean = Boolean(f.excludeHome);
  const verbose: boolean = Boolean(f.verbose);

  if (verbose) ns.tprint(`autoRoot flags: start=${startHost} run=${runPayload} payload=${payload} threads=${payloadThreads} depth=${maxDepth} excludeHome=${excludeHome}`);

  // --- helpers ---
  function fileExistsOnHome(filename: string): boolean {
    return ns.fileExists(filename, "home");
  }

  function tryOpenPorts(host: string): number {
    let opened = 0;
    try { if (fileExistsOnHome("BruteSSH.exe")) { ns.brutessh(host); opened++; } } catch { }
    try { if (fileExistsOnHome("FTPCrack.exe")) { ns.ftpcrack(host); opened++; } } catch { }
    try { if (fileExistsOnHome("relaySMTP.exe")) { ns.relaysmtp(host); opened++; } } catch { }
    try { if (fileExistsOnHome("HTTPWorm.exe")) { ns.httpworm(host); opened++; } } catch { }
    try { if (fileExistsOnHome("SQLInject.exe")) { ns.sqlinject(host); opened++; } } catch { }
    return opened;
  }

  function attemptRoot(host: string): { success: boolean; openedPorts: number; required: number; reason?: string } {
    const required = ns.getServerNumPortsRequired(host);
    if (ns.hasRootAccess(host)) return { success: true, openedPorts: Infinity, required, reason: "alreadyRoot" };
    if (host === "home" && excludeHome) return { success: false, openedPorts: 0, required, reason: "home-excluded" };

    const opened = tryOpenPorts(host);
    if (opened >= required) {
      try {
        ns.nuke(host);
        if (ns.hasRootAccess(host)) return { success: true, openedPorts: opened, required, reason: "nuked" };
        return { success: false, openedPorts: opened, required, reason: "nuke-failed" };
      } catch (e) {
        return { success: false, openedPorts: opened, required, reason: `nuke-exception:${String(e)}` };
      }
    } else {
      return { success: false, openedPorts: opened, required, reason: `not-enough-ports:${opened}/${required}` };
    }
  }

  // --- BFS scan + root ---
  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const queue: { host: string; depth: number }[] = [{ host: startHost, depth: 0 }];
  visited.add(startHost);

  const pservs = ns.getPurchasedServers()
  if (pservs) for (const pserv of pservs) visited.add(pserv)

  parent.set(startHost, null);

  const results: { host: string; depth: number; rootedBefore: boolean; rootedAfter: boolean; opened?: number; required?: number; reason?: string }[] = [];

  while (queue.length > 0) {
    const { host, depth } = queue.shift()!;
    if (depth > maxDepth) continue;

    const hadRoot = ns.hasRootAccess(host);
    const rootRes = attemptRoot(host);

    if (verbose) ns.print(`Processed ${host} depth=${depth} hadRoot=${hadRoot} => ${rootRes.reason}`);

    results.push({
      host,
      depth,
      rootedBefore: hadRoot,
      rootedAfter: ns.hasRootAccess(host),
      opened: rootRes.openedPorts,
      required: rootRes.required,
      reason: rootRes.reason,
    });

    // Nếu root thành công và user muốn chạy payload
    if (rootRes.success && runPayload && host !== "home") {
      try {
        if (!ns.fileExists(payload, "home")) {
          ns.print(`Payload ${payload} not found on home; skipping exec on ${host}`);
        } else {
          ns.scp(payload, host);

          const ramPerThread = ns.getScriptRam(payload, host);
          const serverRam = ns.getServerMaxRam(host);
          const maxThreads = ramPerThread > 0 && serverRam > 0 ? Math.floor(serverRam / ramPerThread) : 0;
          const threadsToRun = Math.max(0, Math.min(payloadThreads, maxThreads));

          if (threadsToRun > 0) {
            ns.killall(host)
            const resolvedArgs = globalPayloadArgTokens.map(tok => tok.replace("{host}", host));
            const pid = ns.exec(payload, host, threadsToRun, ...resolvedArgs);
            if (pid > 0) ns.print(`Started ${payload} on ${host} with ${threadsToRun} threads (pid=${pid}) args=${JSON.stringify(resolvedArgs)}`);
            else ns.print(`WARN Failed to start ${payload} on ${host} (maybe not enough RAM)`);
          } else {
            // ns.tprint(`ERROR Not enough RAM on ${host} to run ${payload}`);
          }
        }
      } catch (e) {
        ns.tprint(`ERROR copying/executing payload on ${host}: ${String(e)}`);
      }
    }

    // scan neighbors
    let neighbors: string[] = [];
    try { neighbors = ns.scan(host); } catch { neighbors = []; }
    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        visited.add(nb);
        parent.set(nb, host);
        queue.push({ host: nb, depth: depth + 1 });
      }
    }
  }

  // --- Tóm tắt ---
  const total = results.length;
  const newlyRooted = results.filter(r => !r.rootedBefore && r.rootedAfter).length;
  const totalRootedBefore = results.filter(r => r.rootedBefore).length;
  ns.tprint(`INFO autoRoot summary: scanned=${total} rootedBefore=${totalRootedBefore} newlyRooted=${newlyRooted}`);

  if (verbose) {
    for (const r of results) {
      ns.tprint(`INFO ${r.host} depth=${r.depth} wasRoot=${r.rootedBefore} nowRoot=${r.rootedAfter} (${r.opened}/${r.required}) reason=${r.reason}`);
    }
  }
}

function help() {
  // --- Nếu yêu cầu help thì in hướng dẫn và exit ---
  return [
    "autoRoot - script tự động chiếm quyền root cho Bitburner",
    "",
    "Usage:",
    "  run autoRoot.js [--start <host>] [--run] [--payload <file>] [--threads <n>] [--depth <n>] [--excludeHome <true|false>] [--verbose <true|false>]",
    "",
    "Flags (ns.flags):",
    "  --start <host>        Server bắt đầu scan (mặc định: home)",
    "  --run                 Nếu có thì copy & exec payload khi server bị root",
    "  --payload <file>      Tên file payload để copy/run (mặc định: hack.js)",
    "  --threads <n>         Số threads tối đa dùng khi exec payload (mỗi server) (mặc định: 1)",
    "  --depth <n>           Giới hạn depth khi scan (mặc định: Infinity)",
    "  --excludeHome <bool>  Có exclude 'home' (true/false). Mặc định true (không nuke home).",
    "  --verbose <bool>      Bật logging chi tiết (true/false). Mặc định false.",
    "  --help                In help này và exit",
    "",
    "Examples:",
    "  run autoRoot.js",
    "  run autoRoot.js --start n00dles --depth 3",
    "  run autoRoot.js --run --payload hack.js --threads 2 --verbose true",
    "  run autoRoot.js --excludeHome false    # cho phép nuke home (hãy cẩn thận!)",
    "",
    "Notes:",
    "  - Các chương trình mở port (BruteSSH.exe, FTPCrack.exe, relaySMTP.exe, HTTPWorm.exe, SQLInject.exe)",
    "    được giả định nằm trên 'home'. Script sẽ chỉ gọi API tương ứng nếu file .exe tồn tại trên home.",
    "  - Script dùng BFS để scan (tìm theo khoảng cách gần nhất trước).",
    "",
  ].join("\n");
}

export function autocomplete(data: AutocompleteData, args: any) {
  data.flags(FLAGS)
  return [...data.servers, ...data.command, ...data.scripts]
}
