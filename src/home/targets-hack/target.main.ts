// scripts/example.ts
import BaseScript from '../bases/module.base-script.ts'
import { isOnCooldown, setCooldown } from '../modules/module.cooldown.ts'
import Target_Module from '../modules/module.target-hack.ts'

export async function main(ns: NS) {
  const script = new Target_Script(ns)
  await script.run(ns)
}

export function autocomplete(data: AutocompleteData) {
  // gọi static autocomplete() từ BaseScript
  return Target_Script.autocomplete(data, Target_Script.argsSchema)
}

class Target_Script extends BaseScript {
  // --- flags riêng của script con
  static argsSchema: [string, string | number | boolean | string[]][] = [
    ['target', 'n00dles'], ['host', 'all'],
    ['rate', 0.01], ['h', false],
  ]

  constructor(ns: NS) {
    super(ns, Target_Script.argsSchema)
    this.utils = new Target_Module(ns, this.logs)
    this.debug = this.logs.isDebug
  }

  private debug: boolean
  private utils: Target_Module

  async run(ns: NS) {
    const { target, rate, h: home, host } = this.flags as {
      target: string, rate: number, h: boolean, host: string
    }

    if (!target || target == '') {
      return this.logs.error(`[target] is [${target}]\n use: run ... --target <server name | all>`)
    }

    const launch_delay = this.utils.isLaunchDelay

    var targets: string[] = [], hosts: string[] = []

    /** Hàm main phụ */
    const submain = async (server: Server) => {
      if (isOnCooldown(server.hostname) && !this.debug) return
      const batches = await this.utils.setupBatThreads(server, rate)
      if (this.debug) {
        this.logs.debug(`[${server.hostname}] Server: ${JSON.stringify(server, null, 2)}`)
        this.logs.debug(`[${server.hostname}] Batches: ${JSON.stringify(batches, null, 2)}`)
      }

      // log info //
      const logMsg: { msg: any }[] = [
        { msg: `[BATT-Target] [${batches.hostname}]` },
        { msg: `[BATT-Threads] H=${batches.hackThreads} WH=${batches.weakenHackThreads} G=${batches.growThreads} WG=${batches.weakenGrowThreads}` },
      ]

      var checkRun = false
      if (batches) {
        batches.normalization ? this.logs.warn(logMsg[0].msg) : this.logs.info(logMsg[0].msg)
        batches.normalization ? this.logs.warn(logMsg[1].msg) : this.logs.info(logMsg[1].msg)
        const runOk = await this.utils.attackBatch(batches, hosts)
        if (runOk) {
          checkRun = true
        }
      }

      checkRun ? this.logs.success(`[EXEC] [${batches.hostname}]`) : this.logs.error(`[EXEC] [${batches.hostname}]`)
      const now = Date.now()
      const value = batches.normalization
        ? now + (batches.endtime + launch_delay * 4)
        : now + Math.max(2000, (batches.endtime + launch_delay) / 20)
      setCooldown(server.hostname, value)
    }

    var old_time = {
      time_host: 0,
      time_target: 0,
      time_copy: 0
    }

    while (true) {
      const now = Date.now()

      if (now - old_time.time_host > 30) {
        hosts = await this.utils.getHost(host, home)
        old_time.time_host = now
      }

      if (now - old_time.time_copy > 60) {
        this.utils.copyScripts
        old_time.time_copy = now
      }

      if (now - old_time.time_target > 25) {
        targets = await this.utils.getTargets(target)
        old_time.time_target = now
      }

      for (const target of targets) {
        const server = this.utils.check_target(target)
        if (!server) continue
        await submain(server)
      }
    }
  }

  // --- autocomplete thêm giá trị gợi ý riêng cho target
  static autocompleteExtra(data: AutocompleteData) {
    return data.servers
  }
}