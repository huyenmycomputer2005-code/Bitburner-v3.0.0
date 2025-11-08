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

    const danh_sach_bo_qua: string[] = []

    try {
      while (true) {

        const targets = target.toLowerCase() === 'all'
          ? (await get_server_hack_ok(ns)).filter((h) => { return ns.getWeakenTime(h) < 240000 })
          : [target]
        const hosts = await get_hosts_ok(ns)
        if (them_home) { hosts.push('home') }
        if (danh_sach_bo_qua.length >= targets.length) { break }

        for (const t of targets) {
          if (danh_sach_bo_qua.includes(t)) continue
          var loop = true
          do {
            await ns.sleep(500)

            if (this.isOnCooldownTarget(t)) continue

            const server = ns.getServer(t)

            if ((server.minDifficulty! + 5) < server.hackDifficulty!) {
              // chuẩn hóa bảo mật
              const weaken_threads = Math.ceil((server.hackDifficulty! - server.minDifficulty!) / 0.05)
              if (weaken_threads <= 0) continue
              logs.info(`[${t}][weaken] Bắt đầu chuẩn hóa`)
              const run_ok = await this.utils.exec_scripts(this.script_path.weaken, this.script_ram.weaken, weaken_threads, t, hosts)
              if (run_ok) {
                const now = Date.now() + ns.getWeakenTime(t)
                this.setCooldownTarget(t, now)
              }
            } else if (server.moneyAvailable! < (server.moneyMax! * 0.9)) {
              // chuẩn hóa money
              const grow_threads = Math.ceil(ns.growthAnalyze(t, server.moneyMax! / server.moneyAvailable!))
              if (grow_threads <= 0) continue
              logs.info(`[${t}][grow] Bắt đầu chuẩn hóa`)
              const run_ok = await this.utils.exec_scripts(this.script_path.grow, this.script_ram.grow, grow_threads, t, hosts)
              if (run_ok) {
                const now = Date.now() + ns.getGrowTime(t)
                this.setCooldownTarget(t, now)
              }
            } else {
              if (server.hackDifficulty! <= server.minDifficulty! && server.moneyAvailable! >= server.moneyMax!) {
                loop = false
                danh_sach_bo_qua.push(t)
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
    if (now - i <= 0) {
      this.cool_downs.delete(key)
      return false
    } else return true
  }


  static autocompleteExtra(data: AutocompleteData): string[] {
    return data.servers
  }
}