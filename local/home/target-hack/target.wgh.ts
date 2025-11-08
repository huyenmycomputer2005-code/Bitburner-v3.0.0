import { Logger, LogLevel } from '../modules/module.logger.ts'
import { get_hosts_ok } from '../modules/module.deep-scan.ts'
import Utils from '../modules/module.utils.ts'

var logs: Logger, debug: boolean, utils: Utils
const script_path = {
  hack: 'bins/bin.hack.ts', grow: 'bins/bin.grow.ts', weaken: 'bins/bin.weaken.ts'
}
const script_rams = { hack: 0, grow: 0, weaken: 0 }
const logListLevel = ['debug', 'info', 'succ', 'warn', 'error']
const argsSchema: [string, string | number | boolean | string[]][] = [
  ['target', ''], ['loglevel', 'info'], ['rate', 0.1], ['l', false], ['d', false]
]

export async function main(ns: NS) {
  ns.disableLog('ALL')

  const flags = ns.flags(argsSchema) as { target: string, loglevel: string, rate: number, d: boolean, l: boolean }

  const [d, logEnabled, target, rate] = [flags.d, flags.l, flags.target, flags.rate]

  var [loglevel] = [flags.loglevel]

  if (!logListLevel.includes(loglevel)) { loglevel = 'info' } else if (debug) loglevel = 'debug'

  const logMinLevel = {
    ['debug']: LogLevel.DEBUG, ['info']: LogLevel.INFO, ['succ']: LogLevel.SUCCESS, ['warn']: LogLevel.WARN, ['error']: LogLevel.ERROR
  }[loglevel] || loglevel

  script_rams.hack = ns.getScriptRam(script_path.hack)
  script_rams.grow = ns.getScriptRam(script_path.grow)
  script_rams.weaken = ns.getScriptRam(script_path.weaken)
  debug = d

  logs = new Logger(ns, { enabled: logEnabled, showTimestamp: d, useTerminal: false })
  logs.setLevel(logMinLevel as LogLevel)
  logs.setDebug(debug)
  utils = new Utils(ns, logs)

  if (logEnabled) { ns.clearLog(); ns.ui.openTail() }

  try {
    var server: Server | null = null
    const times = {
      hack: (t: string) => { return ns.getHackTime(t) },
      grow: (t: string) => { return ns.getGrowTime(t) },
      weaken: (t: string) => { return ns.getWeakenTime(t) }
    }

    while (true) {
      const hosts = await get_hosts_ok(ns)
      if (hosts.length <= 0) hosts.push('home')
      if (!target || target == '') throw new Error(`fun-main: target is not ${target}`)
      if (!server) { server = utils.check_server(target) } else server = ns.getServer(target)
      if (!server) throw new Error(`fun-main: server is not ${server}`)

      var run_ok = false
      const moneyMax = server.moneyMax!
      const moneyAvailable = server.moneyAvailable!
      const hackDifficulty = server.hackDifficulty!
      const minDifficulty = server.minDifficulty!

      if (hackDifficulty > minDifficulty + 2) {
        const time_weaken = times.weaken(target)
        const use_threads = Math.ceil((hackDifficulty - minDifficulty) / 0.05)
        if (utils.check_ram_host(script_rams.weaken, hosts) <= 0) {
          logs.error(`[${target}][hosts] ram thấp`)
          await ns.sleep(5000)
          continue
        }
        logs.info(`[${target}][weaken] t=${use_threads} time:${Math.ceil(time_weaken / 1000)}s`)
        run_ok = await utils.run_scripts(script_path.weaken, script_rams.weaken, use_threads, target, hosts)
        if (run_ok) await ns.sleep(time_weaken)
        logs.success(`[${target}][weaken] xong`)

      }

      if (moneyAvailable < moneyMax * 0.9) {
        const time_grow = times.grow(target)
        const use_threads = Math.max(1, Math.ceil(ns.growthAnalyze(target, (moneyMax / moneyAvailable))))
        if (utils.check_ram_host(script_rams.grow, hosts) <= 0) {
          logs.error(`[${target}][hosts] ram thấp`)
          await ns.sleep(5000)
          continue
        }
        logs.info(`[${target}][grow] t=${use_threads} time:${Math.ceil(time_grow / 1000)}s`)
        run_ok = await utils.run_scripts(script_path.grow, script_rams.grow, use_threads, target, hosts)
        if (run_ok) await ns.sleep(time_grow)
        logs.success(`[${target}][grow] xong`)

      }

      // else {
      //   const time_hack = times.hack(target)
      //   const use_threads = Math.max(1, Math.ceil(ns.hackAnalyzeThreads(target, (moneyAvailable * rate))))
      //   if (utils.check_ram_host(script_rams.hack, hosts) <= 0) {
      //     logs.error(`[${target}][hosts] ram thấp`)
      //     await ns.sleep(5000)
      //     continue
      //   }
      //   logs.info(`[${target}][hack] t=${use_threads} time:${Math.ceil(time_hack / 1000)}s`)
      //   run_ok = await utils.run_scripts(script_path.hack, script_rams.hack, use_threads, target, hosts)
      //   if (run_ok) await ns.sleep(time_hack)
      //   logs.success(`[${target}][hack] xong`)
      // }

      await ns.sleep(200)
    }
  } catch (error) {
    logs.error(`${error}`)
  }
}


export function autocomplete(data: AutocompleteData, args: any) {
  data.flags(argsSchema)
  return [...data.servers, ...data.command]
}