import BaseScript from "../bases/module.base-script";
import { get_hosts_ok, get_server_hack_ok } from "../modules/module.deep-scan";
import Utils from "../modules/module.utils";

export async function main(ns: NS) {
  const script = new Normalize(ns)
  await script.run()
}

export function autocomplete(data: AutocompleteData) {
  return Normalize.autocomplete(data, Normalize.argsSchem)
}

class Normalize extends BaseScript {
  static argsSchem: [string, string | number | boolean | string[]][] = [
    ['target', 'all'],
    ['h', false]
  ]

  constructor(ns: NS) {
    super(ns, Normalize.argsSchem)
    this.utils = new Utils(ns, this.logs)
    this.script_ram = {
      weaken: ns.getScriptRam(this.script_path.weaken),
      grow: ns.getScriptRam(this.script_path.grow)
    }
  }

  private utils: Utils
  private cool_downs: Map<string, number> = new Map()
  private script_path = {
    weaken: 'bins/bin.weaken.ts',
    grow: 'bins/bin.grow.ts'
  }
  private script_ram: {
    weaken: number,
    grow: number
  }

  async run(ns = this.ns, logs = this.logs) {
    const { target, h: them_home } = this.flags as { target: string, h: boolean }
    if (!target || target == '') return

    // const danh_sach_bo_qua: string[] = []
    var loop = true

    try {
      while (true) {
        ns.clearLog()
        const targets = target.toLowerCase() === 'all'
          ? (await get_server_hack_ok(ns)).filter((h) => ns.getWeakenTime(h) < 120000)
          : [target]
        var hosts: string[] = []
        if (them_home) { hosts = ['home'] } else hosts = await get_hosts_ok(ns)
        // if (danh_sach_bo_qua.length >= targets.length) { return }
        for (const t of targets) {
          // if (danh_sach_bo_qua.includes(t)) continue
          do {
            await ns.sleep(500)
            if (this.isOnCooldownTarget(t)) continue

            const server = ns.getServer(t)
            ns.print('target: ' + server.hostname)
            ns.print('hack: ' + Math.ceil(ns.hackAnalyzeThreads(t, server.moneyMax!)))
            ns.print('grow: ' + Math.ceil(ns.growthAnalyze(t, server.moneyMax! / server.moneyAvailable!, ns.getServer(hosts[0]).cpuCores)))
            ns.print('weaken: ' + Math.ceil((server.hackDifficulty! - server.minDifficulty!) / 0.05))

            if ((server.minDifficulty! + 2) < server.hackDifficulty!) {
              // chuẩn hóa bảo mật
              const weaken_threads = Math.ceil((server.hackDifficulty! - server.minDifficulty!) / 0.05)
              if (weaken_threads <= 0) continue

              logs.info(`[${t}][weaken] Bắt đầu chuẩn hóa`)

              await this.utils.exec_scripts(this.script_path.weaken, this.script_ram.weaken, weaken_threads, t, hosts)
              const now = Date.now()
              this.setCooldownTarget(t, now + ns.getWeakenTime(t))

            } else if (server.moneyAvailable! < (server.moneyMax! * 0.9)) {
              // chuẩn hóa money
              const grow_threads = Math.ceil(ns.growthAnalyze(t, server.moneyMax! / server.moneyAvailable!, ns.getServer(hosts[0]).cpuCores))
              if (grow_threads <= 0) continue

              logs.info(`[${t}][grow] Bắt đầu chuẩn hóa`)

              await this.utils.exec_scripts(this.script_path.grow, this.script_ram.grow, grow_threads, t, hosts)
              const now = Date.now()
              this.setCooldownTarget(t, now + ns.getGrowTime(t))

            } else {
              if (server.hackDifficulty! <= server.minDifficulty! + 2 && server.moneyAvailable! >= server.moneyMax! * 0.9) {
                // danh_sach_bo_qua.push(t)
                loop = false
              }
            }
          } while (loop)
        }
        await ns.sleep(500)
      }
    } catch (error) {
      logs.error(`${error}`)

    } finally {
      logs.success('Script Run Done')
    }

  }


  private setCooldownTarget(key: string, value: number, ns = this.ns) {
    this.cool_downs.set(key, value)
  }

  private isOnCooldownTarget(key: string, ns = this.ns) {
    const i = this.cool_downs.get(key)
    const now = Date.now()
    if (!i) { return false }
    // this.logs.error(`! ${(i - now) / 1000}`)
    if (i - now <= 0) {
      this.cool_downs.delete(key)
      return false
    }
    return true
  }


  static autocompleteExtra(data: AutocompleteData): string[] {
    return data.servers
  }
}