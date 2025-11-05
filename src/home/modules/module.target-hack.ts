import { get_hosts_ok, get_server_hack_ok } from './module.deep-scan.ts';
import { type Logger } from './module.logger.ts';

/**@public */
export interface Batch {
  hostname: string;
  normalization: boolean;
  hackThreads: number;
  growThreads: number;
  weakenHackThreads: number;
  weakenGrowThreads: number;
  totalThreads: number;
  endtime: number;
  timeHack: number;
  timeGrow: number;
  timeWeaken: number
}

export interface Configs {
  stagger: number
  launch_delay: number
  maxram: number
  debug: boolean
}

export default class Target_Module {
  private ns: NS
  private logs: any
  private configs: Configs
  private scrips_path = {
    hack: "bins/bin.hack.ts",
    grow: "bins/bin.grow.ts",
    weaken: "bins/bin.weaken.ts"
  }
  private scrips_ram: {
    hack: number
    grow: number
    weaken: number
  }

  constructor(ns: NS, logs: Logger, configs?: Partial<Configs>) {
    this.ns = ns
    this.logs = logs
    this.scrips_ram = {
      hack: ns.getScriptRam(this.scrips_path.hack),
      grow: ns.getScriptRam(this.scrips_path.grow),
      weaken: ns.getScriptRam(this.scrips_path.weaken)
    }
    this.configs = {
      stagger: 400,
      launch_delay: 400,
      maxram: Math.max(...Object.values(this.scrips_ram) as number[]),
      debug: logs.isDebug || false,
      ...configs
    }
  }


  /** Kiểm tra chuẩn hóa và thiết lập các luồn cho đợt tấn công */
  public async setupBatThreads(server: Server, rate: number): Promise<Batch> {
    // --- Thông tin server --- //
    const target = server.hostname
    var moneyAvailable = server.moneyAvailable!
    const moneyMax = server.moneyMax!
    const minDifficulty = server.minDifficulty!
    var hackDifficulty = server.hackDifficulty!
    // --- Khởi tạo biến cục bộ --- //
    var [hack_Threads, grow_Threads, weakenH_Threads, weakenG_Threads] = [0, 0, 0, 0]
    const valueWeaken = this.ns.weakenAnalyze(1)
    const times = this.timesWGH(target)
    const timemax = Math.max(...Object.values(times) as number[])
    /** Server normalization */
    if (hackDifficulty > minDifficulty + 2 || moneyAvailable < moneyMax * 0.09) {
      // --- Kiểm tra tiền --- //
      grow_Threads += Math.max(1, Math.ceil(this.ns.growthAnalyze(target, (moneyMax / moneyAvailable))))
      if (grow_Threads > 0) hackDifficulty += grow_Threads * Math.max(0.004, this.ns.hackAnalyzeSecurity(1, target))

      // --- Kiểm tra bảo mật --- //
      weakenG_Threads += Math.max(1, Math.ceil((hackDifficulty - minDifficulty) / valueWeaken))

      return {
        hostname: target,
        normalization: true,
        hackThreads: hack_Threads,
        growThreads: grow_Threads,
        weakenHackThreads: weakenH_Threads,
        weakenGrowThreads: weakenG_Threads,
        totalThreads: hack_Threads + grow_Threads + weakenH_Threads + weakenG_Threads,
        endtime: timemax,
        timeHack: times.th,
        timeGrow: times.tg,
        timeWeaken: times.tw
      }
    }
    /** Thiết lập HWGW */
    else {
      // --- Hack threads --- //
      hack_Threads += Math.max(1, Math.ceil(this.ns.hackAnalyzeThreads(target, (moneyAvailable * rate),)))
      if (!isFinite(hack_Threads)) hack_Threads = 0

      // --- Grow threads --- //
      const safeMoney = Math.max(1, moneyAvailable - (moneyAvailable * rate))
      const growRatio = moneyMax / safeMoney
      grow_Threads += Math.max(1, Math.ceil(this.ns.growthAnalyze(target, growRatio)))

      // --- Weaken threads --- //
      if (hack_Threads > 0) {
        // -- Weaken Hack -- //
        const security_Hack = Math.ceil(hack_Threads * Math.max(0.002, this.ns.hackAnalyzeSecurity(1, target)))
        weakenH_Threads += Math.max(1, Math.ceil(security_Hack / valueWeaken))
      }

      if (grow_Threads > 0) {
        // -- Weaken Grow -- //
        const security_Grow = Math.ceil(grow_Threads * Math.max(0.004, this.ns.hackAnalyzeSecurity(1, target)))
        weakenG_Threads += Math.max(1, Math.ceil(security_Grow / valueWeaken))
      }

      return {
        hostname: target,
        normalization: false,
        hackThreads: hack_Threads,
        growThreads: grow_Threads,
        weakenHackThreads: weakenH_Threads,
        weakenGrowThreads: weakenG_Threads,
        totalThreads: hack_Threads + grow_Threads + weakenH_Threads + weakenG_Threads,
        endtime: timemax,
        timeHack: times.th,
        timeGrow: times.tg,
        timeWeaken: times.tw
      }
    }
  }


  /** Kiểm tra Batch và chiển khai */
  public async attackBatch(batches: Batch, hosts: string[]): Promise<boolean> {
    if (!batches) return false
    if (batches.normalization) {
      /** Chạy chuẩn hóa máy chủ */
      // check threads trên hosts //
      const totalThreads = batches.totalThreads

      const totalServerThreads = await this.getfreeThreadsServer(this.configs.maxram, hosts)
      if (totalThreads > totalServerThreads) return false

      // Thoản mản điều kiện bắt đầu triển khai scripts //
      const execOK = await this.execAllocList(hosts, batches)
      if (!execOK) return false

      return true
    } else {
      /** Bắt đầu tấn công máy chủ */
      // check threads trên hosts //
      const totalThreads = batches.totalThreads

      const totalServerThreads = await this.getfreeThreadsServer(this.configs.maxram, hosts)
      if (totalThreads > totalServerThreads) return false

      // Thoản mản điều kiện bắt đầu triển khai scripts //
      const execOK = await this.execAllocList(hosts, batches)
      if (!execOK) return false

      return true
    }
  }


  /** Hàm Triển khai trính */
  private async execAllocList(hosts: string[], batches: Batch): Promise<boolean> {
    // Khởi tạo biến cục bộ và kiểm tra lại các host //
    if (!batches) return false
    var batch_Threads = batches.totalThreads
    const target = batches.hostname
    const maxRam = Math.max(...Object.values(this.scrips_ram) as number[])
    if (batch_Threads > await this.getfreeThreadsServer(maxRam, hosts)) return false

    // threads cần cho từng script //
    var tHack = batches.hackThreads
    var tGrow = batches.growThreads
    var tWeakH = batches.weakenHackThreads
    var tWeakG = batches.weakenGrowThreads

    // times (ms) //
    const th = batches.timeHack
    const tg = batches.timeGrow
    const tw = batches.timeWeaken

    // chọn một finish timeline: ta chọn baseFinish = now + maxExecTime + LAUNCH_DELAY //
    const now = Date.now()
    const baseFinish = now + tw + this.configs.launch_delay

    // Muốn các finish theo thứ tự: hack -> weakenH -> grow -> weakenG //
    // Ta đặt finish times theo offsets:
    const finishHack = baseFinish - this.configs.stagger * 3
    const finishWeakH = baseFinish - this.configs.stagger * 2
    const finishGrow = baseFinish - this.configs.stagger
    const finishWeakG = baseFinish

    // Tính start times = finish - execTime //
    const startHack = Math.max(0, finishHack - th)
    const startWeakH = Math.max(0, finishWeakH - tw)
    const startGrow = Math.max(0, finishGrow - tg)
    const startWeakG = Math.max(0, finishWeakG - tw)
    if (this.configs.debug) {
      this.logs.debug(`[${target}] - startHack: ${this.ns.format.time(Math.max(0, startHack - Date.now()))}`)
      this.logs.debug(`[${target}] - startWeakH: ${this.ns.format.time(Math.max(0, startWeakH - Date.now()))}`)
      this.logs.debug(`[${target}] - startGrow: ${this.ns.format.time(Math.max(0, startGrow - Date.now()))}`)
      this.logs.debug(`[${target}] - startWeakG: ${this.ns.format.time(Math.max(0, startWeakG - Date.now()))}`)
      return false
    }

    // Loop chạy các sripts cho đến khi hoàn thành //
    while (batch_Threads > 0) {
      await this.ns.sleep(10)
      for (const host of hosts) {
        if (this.getFreeRamServer(host) < 0) continue

        if (tHack > 0) {
          const threadsHost = await this.getfreeThreadsServer(this.scrips_ram.hack, [host])
          if (threadsHost <= 1) continue
          const use_Threads = Math.min(threadsHost, tHack)
          const runOK = this.ns.exec(this.scrips_path.hack, host, use_Threads, ...[target, startHack, this.configs.debug])
          if (runOK <= 0) continue
          tHack -= use_Threads
          batch_Threads -= use_Threads
        }

        if (tWeakH > 0) {
          const threadsHost = await this.getfreeThreadsServer(this.scrips_ram.weaken, [host])
          if (threadsHost <= 1) continue
          const use_Threads = Math.min(threadsHost, tWeakH)
          const runOK = this.ns.exec(this.scrips_path.weaken, host, use_Threads, ...[target, startWeakH, this.configs.debug])
          if (runOK <= 0) continue
          tWeakH -= use_Threads
          batch_Threads -= use_Threads
        }

        if (tGrow > 0) {
          const threadsHost = await this.getfreeThreadsServer(this.scrips_ram.grow, [host])
          if (threadsHost <= 1) continue
          const use_Threads = Math.min(threadsHost, tGrow)
          const runOK = this.ns.exec(this.scrips_path.grow, host, use_Threads, ...[target, startGrow, this.configs.debug])
          if (runOK <= 0) continue
          tGrow -= use_Threads
          batch_Threads -= use_Threads
        }

        if (tWeakG > 0) {
          const threadsHost = await this.getfreeThreadsServer(this.scrips_ram.weaken, [host])
          if (threadsHost <= 1) continue
          const use_Threads = Math.min(threadsHost, tWeakG)
          const runOK = this.ns.exec(this.scrips_path.weaken, host, use_Threads, ...[target, startWeakG, this.configs.debug])
          if (runOK <= 0) continue
          tWeakG -= use_Threads
          batch_Threads -= use_Threads
        }

        if (batch_Threads < 0) break
      }
    }
    return true
  }


  /** Lấy free Ram host */
  private getFreeRamServer(host: string): number {
    return Math.max(0, (this.ns.getServerMaxRam(host) - this.ns.getServerUsedRam(host)))
  }


  /** Lấy threads host hoặc hosts*/
  private async getfreeThreadsServer(scriptRam: number, hosts: string[]): Promise<number> {
    if (scriptRam <= 0) throw new Error(`getfreeThreadsServer: scriptRam: ${scriptRam} ==> phải lớn hơn 0`)
    var freeThreads = 0
    for (const host of hosts) {
      const free = this.getFreeRamServer(host)
      if (free <= 0) continue
      freeThreads += Math.floor(free / scriptRam)
    }
    return freeThreads
  }


  /** Lấy thời gian thực thi của hàm hack, grow, weaken */
  private timesWGH(target: string) {
    return {
      th: Math.ceil(this.ns.getHackTime(target)),
      tg: Math.ceil(this.ns.getGrowTime(target)),
      tw: Math.ceil(this.ns.getWeakenTime(target))
    }
  }


  /** Kiểm tra target có đủ điều kiện không */
  public check_target(target: string) {
    const server = this.ns.getServer(target)
    if (!server) {
      this.ns.tprint(`❌ Không tìm thấy server: ${target}`)
      return null
    }
    if (!server.hasAdminRights) {
      this.ns.tprint(`⚠️ Chưa có quyền admin trên ${target}`)
      return null
    }
    if (server.moneyMax! <= 0) {
      this.ns.tprint(`⚠️ ${target} Không có tiền để hack`)
      return null
    }
    return server
  }


  /** Lấy danh sách các host có thể dùng */
  private async get_hosts(prefix: string, sp: boolean = false) {
    var hosts: string[] = []
    this.logs.info(`[GET-HOSTS]`)

    if (prefix.toLowerCase() === 'all') {
      hosts = await get_hosts_ok(this.ns)
    } else {
      hosts = [prefix]
    }

    if (hosts.length <= 0) hosts.push('home')
    if (sp && !hosts.includes('home')) hosts.push('home')

    this.logs.success(`[GET-HOSTS] ${hosts.length} host`)
    return hosts
  }


  private copy_script(hosts: string[]) {
    if (this.configs.debug) this.logs.info(`[COPY-SCRIPT]`)

    for (const host of hosts) {
      if (host === 'home') continue
      this.ns.scp(Object.values(this.scrips_path) as string[], host)
    }

    if (this.configs.debug) this.logs.success(`[COPY-SCRIPT] ${hosts.length} host`)
  }


  private async get_targets(prefix: string) {
    var servers: string[] = []
    this.logs.info(`[GET-TARGETS]`)

    if (prefix.toLowerCase() === 'all') {
      servers = await get_server_hack_ok(this.ns)
    } else {
      servers = [prefix]
    }

    this.logs.success(`[GET-TARGETS] ${servers.length} server`)
    return servers
  }


  async getHost(prefix: string, h: boolean = false) { return await this.get_hosts(prefix, h) }
  async getTargets(prefix: string) { return await this.get_targets(prefix) }

  copyScripts(hosts: string[]) { return this.copy_script(hosts) }

  get isLaunchDelay() { return this.configs.launch_delay }
  get isStagger() { return this.configs.stagger }
  get isRams() { return this.scrips_ram }
  get isPath() { return this.scrips_path }
}



