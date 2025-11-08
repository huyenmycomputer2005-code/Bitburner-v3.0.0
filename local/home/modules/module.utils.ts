import { Logger } from '../modules/module.logger'

interface Configs {

}

export default class Utils {
  private ns: NS
  private logs: Logger
  private config: Configs
  private debug: boolean

  constructor(ns: NS, logs: Logger, config?: Partial<Configs>) {
    this.ns = ns
    this.logs = logs
    this.debug = logs.isDebug || false
    this.config = {
      ...config
    }
  }

  nformat(data: number) { return this.ns.format.number(data) }
  tformat(data: number) { return this.ns.format.time(data) }
  rformat(data: number) { return this.ns.format.ram(data) }
  pformat(data: number) { return this.ns.format.percent(data) }

  check_server(target: string): Server {
    const server = this.ns.getServer(target)
    if (!server.hasAdminRights) throw new Error(`fun-check_server: ${target} is root ${server.hasAdminRights}`)
    if (!server.moneyMax || server.moneyMax <= 0) throw new Error(`fun-check_server: ${target} not Money ${server.moneyMax}`)
    if (server.requiredHackingSkill! > this.ns.getHackingLevel()) throw new Error(`fun-check_server: ${target} Level hack quá cao`)
    return server
  }

  check_ram_host(script_ram: number, hosts: string[]): number {
    if (!hosts) throw new Error(`fun-check_ram_host: hosts is not ${hosts}`)
    if (!script_ram || script_ram <= 0) throw new Error(`fun-check_ram_host: ram script ${script_ram}`)
    var threads_all_hosts = 0
    for (const h of hosts) {
      if (!h) continue
      const fee_ram = this.ns.getServerUsedRam(h)
      const max_ram = this.ns.getServerMaxRam(h)
      const avai_ram = max_ram - fee_ram
      const avai_threads = Math.max(0, Math.floor(avai_ram / script_ram))
      if (!avai_threads || avai_threads <= 0) continue
      threads_all_hosts += avai_threads
    }
    return threads_all_hosts
  }


  async exec_scripts(script_path: string, script_ram: number, need_Threads: number, target: string, hosts: string[]): Promise<boolean> {

    if (need_Threads <= 0) return false
    if (script_ram <= 0) return false
    if (!script_path) return false

    if (need_Threads > 0) this.logs.info(`[threads][${need_Threads}]`)
    while (need_Threads > 0) {
      await this.ns.sleep(50)
      for (const h of hosts) {
        if (!h) continue
        this.ns.scp(script_path, h, 'home')
        if (!this.ns.fileExists(script_path, h)) continue

        const fee_ram = this.ns.getServerUsedRam(h)
        const max_ram = this.ns.getServerMaxRam(h)
        const avai_ram = h === 'home' ? (max_ram - 32) - fee_ram : max_ram - fee_ram
        const use_threads = Math.max(0, Math.floor(avai_ram / script_ram))
        if (use_threads <= 0) continue

        const take = Math.min(use_threads, need_Threads)
        const run_ok = this.ns.exec(script_path, h, take, ...[target])
        if (run_ok <= 0) continue
        if (this.debug) this.logs.debug(`[${target}][exec] run script as ${take} threads`)
        need_Threads -= take
        if (need_Threads <= 0) break
      }
      await this.ns.sleep(50)
    }
    if (need_Threads > 0) { this.logs.error(`[${target}][exec] fail`); return false }
    this.logs.success(`[${target}][exec] done`)
    return true
  }
}