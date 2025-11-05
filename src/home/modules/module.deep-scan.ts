/** module.deepScan.ts */
export async function deepScan(ns: NS): Promise<string[]> {
  // --- BFS scan + root ---
  const listSvrs: string[] = []
  const visited = new Set<string>()
  const queue = ['home']
  visited.add('home')

  while (queue.length > 0) {
    const host = queue.shift()!
    if (host !== 'home') listSvrs.push(host)
    // scan neighbors
    let neighbors = ns.scan(host) ?? []
    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
      }
    }
    await ns.sleep(10)
  }
  return listSvrs
}

export async function get_hosts_ok(ns: NS, danh_sach_cac_server?: string[]): Promise<string[]> {
  const danh_sach_host_ok: string[] = []
  danh_sach_cac_server = !danh_sach_cac_server ? await deepScan(ns) : danh_sach_cac_server

  for (const host of danh_sach_cac_server) {
    if (!ns.hasRootAccess(host)) continue;
    if (ns.getServerMaxRam(host) <= 0) continue
    danh_sach_host_ok.push(host)
  }
  return danh_sach_host_ok.sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
}

export async function get_server_hack_ok(ns: NS, list_svrs?: string[]): Promise<string[]> {
  const cur_lvl_hk = ns.getHackingLevel()
  const danh_sach_hack_ok: string[] = []
  const danh_sach_cac_server: string[] = list_svrs ? list_svrs : await deepScan(ns)

  for (const host of danh_sach_cac_server) {
    if (ns.getServerRequiredHackingLevel(host) > cur_lvl_hk) continue
    if (!ns.hasRootAccess(host)) continue;
    if (ns.getServerMaxMoney(host) <= 0) continue
    danh_sach_hack_ok.push(host)
  }
  return danh_sach_hack_ok
}