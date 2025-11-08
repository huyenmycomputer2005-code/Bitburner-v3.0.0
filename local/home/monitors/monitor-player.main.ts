// scripts/example.ts
import BaseScript from '../bases/module.base-script'
import { deepScan } from '../modules/module.deep-scan'

export async function main(ns: NS) {
  const script = new MonitorScript(ns)
  await script.run(ns)
}

export function autocomplete(data: AutocompleteData) {
  // gọi static autocomplete() từ BaseScript
  return MonitorScript.autocomplete(data, MonitorScript.argsSchema)
}

class MonitorScript extends BaseScript {
  // --- flags riêng của script con
  static argsSchema: [string, string | number | boolean | string[]][] = []

  constructor(ns: NS) {
    super(ns, MonitorScript.argsSchema)
  }

  async run(ns: NS = this.ns, logs = this.logs) {
    while (true) {
      try {
        const player = ns.getPlayer()
        const all_server = (await deepScan(ns)).filter((h) => ns.getServerMaxRam(h) > 0)
        const pservs = ns.getPurchasedServers()

        const num_activate_pserv = pservs.filter((t) => ns.getServerUsedRam(t) > 0).length
        const num_all_servers = all_server.filter((t) => ns.getServerUsedRam(t) > 0).length

        ns.clearLog()
        logs.info(`All Servers    : ${all_server.length}`)
        logs.info(`Active Pserv   : ${num_activate_pserv}`)
        logs.info(`Active servers : ${num_all_servers}`)
      }
      catch (error) {
        logs.enable(true)
        logs.error(`Script ${ns.getScriptName()} run fail! ❎`)
        logs.error(`${error}`)
        ns.ui.openTail()
        break
      }
      await ns.sleep(200)
    }
  }

  // --- autocomplete thêm giá trị gợi ý riêng cho target
  static autocompleteExtra(data: AutocompleteData) {
    return data.servers
  }
}
