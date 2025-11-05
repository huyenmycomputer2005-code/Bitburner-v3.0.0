// module.base-script.ts
import { Logger, LogLevel } from 'modules/module.logger.ts'

export default abstract class BaseScript {
  ns: NS
  logs: Logger
  flags: Record<string, any>
  static baseArgs: [string, string | number | boolean | string[]][] = [
    ['loglevel', 'info'],
    ['l', false],
    ['d', false],
  ]

  constructor(ns: NS, extraArgs: [string, string | number | boolean | string[]][] = []) {
    ns.disableLog('ALL')
    this.ns = ns

    // --- merge base args + extra args của script con
    const argsSchema = [...BaseScript.baseArgs, ...extraArgs]
    this.flags = ns.flags(argsSchema)

    const { loglevel, l: logEnabled, d: debug } = this.flags

    const logMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      succ: LogLevel.SUCCESS,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
    }

    // --- setup logger
    this.logs = new Logger(ns, {
      enabled: logEnabled,
      showTimestamp: debug,
      useTerminal: false,
    })
    this.logs.setLevel(logMap[loglevel] ?? LogLevel.INFO)

    if (logEnabled) {
      ns.clearLog()
      ns.ui.openTail()
    }

    if (debug) this.logs.info(`BaseScript init | level=${loglevel} | tail=${logEnabled} | time=${debug}`)
  }

  /** Mỗi script con phải override run() */
  abstract run(): Promise<void>

  /** Hàm này script con có thể override để thêm autocomplete riêng */
  static autocompleteExtra?(data: AutocompleteData): string[]

  /** Tự động ghép autocomplete base + extra */
  static autocomplete(data: AutocompleteData, extraArgs: [string, any][] = []) {
    const merged = [...BaseScript.baseArgs, ...extraArgs]
    data.flags(merged)
    const extras = this.autocompleteExtra ? this.autocompleteExtra(data) : []
    return [...data.servers, ...extras]
  }
}
