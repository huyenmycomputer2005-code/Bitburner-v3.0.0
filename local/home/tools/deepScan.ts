const FLAGS: [string, string | number | boolean | string[]][] = [
  ['start', 'home'], ['depth', Infinity], ['info', false]
]

export async function main(ns: NS) {
  // Ví dụ gọi: node: run deepScan.js home 3 true
  const flags = ns.flags(FLAGS) as { start: string, depth: number, info: boolean };
  const start = flags.start;
  const maxDepth = flags.depth;
  const includeDetails = flags.info;

  const servers = deepScan(ns, start, { maxDepth, includeDetails });
  ns.tprint(`Found ${servers.length} servers (start=${start}, maxDepth=${maxDepth}):`);

  for (const s of servers) {
    if (includeDetails) {
      if (!s.hasRoot) continue
      if (s.moneyMax! as number <= 0) continue
      s.moneyMax = ns.format.number(s.moneyMax as number)

      ns.tprint(JSON.stringify(s, null, 2))
    } else ns.tprint(JSON.stringify(s.host, null, 2))
  }

}

/**
 * deepScan - duyệt mạng từ server bắt đầu và trả về mảng server
 * @param {NS} ns - đối tượng Netscript
 * @param {string} start - server bắt đầu (ví dụ "home")
 * @param {Object} opts - tuỳ chọn
 *    opts.maxDepth {number} - giới hạn độ sâu (mặc định Infinity)
 *    opts.includeDetails {boolean} - nếu true, trả về object chi tiết thay vì chỉ tên server
 * @returns {Array} mảng tên server hoặc object chi tiết
 */
export function deepScan(ns: NS, start = "home", opts: { maxDepth: number, includeDetails: boolean }) {
  const maxDepth = (opts.maxDepth === undefined) ? Infinity : opts.maxDepth;
  const includeDetails = !!opts.includeDetails;

  const visited = new Set();
  const result: {
    host: string;
    depth: number;
    parent: string | null;
    maxRam: string | null;
    moneyMax: number | string | null;
    requiredHackingLevel: number | null;
    numPortsRequired: number | null;
    hasRoot: boolean | null;
  }[] = [];

  // DFS đệ quy (an toàn nhờ visited)
  function dfs(host: string, depth: number, parent: string | null = null) {
    if (visited.has(host)) return;
    if (depth > maxDepth) return;

    visited.add(host);

    // Lấy thông tin cơ bản — bọc try/catch để tránh lỗi API
    let info: {
      host: string,
      depth: number,
      parent: string | null,
      maxRam: string | null,
      moneyMax: number | string | null,
      times: {
        hack: string | null,
        grow: string | null,
        weaken: string | null,
      },
      requiredHackingLevel: number | null,
      numPortsRequired: number | null,
      hasRoot: boolean | null
    } = {
      host: host,
      depth: depth,
      parent: parent,
      maxRam: null,
      moneyMax: null,
      times: {
        hack: null,
        grow: null,
        weaken: null,
      },
      requiredHackingLevel: null,
      numPortsRequired: null,
      hasRoot: null
    };
    try {
      info.maxRam = ns.format.ram(ns.getServerMaxRam(host));
    } catch (e) {
      info.maxRam = null;
    }
    try {
      info.moneyMax = ns.getServerMaxMoney(host)
    } catch (e) {
      info.moneyMax = null
    }
    try {
      info.times.hack = ns.format.time(ns.getHackTime(host))
      info.times.grow = ns.format.time(ns.getGrowTime(host))
      info.times.weaken = ns.format.time(ns.getWeakenTime(host))
    } catch (e) {
      info.times.hack = null
      info.times.grow = null
      info.times.weaken = null
    }
    try {
      info.requiredHackingLevel = ns.getServerRequiredHackingLevel(host);
    } catch (e) {
      info.requiredHackingLevel = null;
    }
    try {
      info.numPortsRequired = ns.getServerNumPortsRequired(host);
    } catch (e) {
      info.numPortsRequired = null;
    }
    try {
      info.hasRoot = ns.hasRootAccess(host);
    } catch (e) {
      info.hasRoot = null;
    }
    result.push(info);

    // Duyệt các server láng giềng
    let neighbors: string[] = [];
    try {
      neighbors = ns.scan(host);
    } catch (e) {
      neighbors = [];
    }

    for (const nb of neighbors) {
      if (!visited.has(nb)) dfs(nb, depth + 1, host);
    }
  }

  dfs(start, 0, null);
  return result;
}

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
  data.flags(FLAGS)
  return [...data.servers, ...data.command]
}