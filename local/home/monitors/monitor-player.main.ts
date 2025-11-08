// scripts/example.ts
import BaseScript from '../bases/module.base-script'

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
  static argsSchema: [string, string | number | boolean | string[]][] = [
    ['target', 'n00dles'], ['repeat', 1],
  ]

  constructor(ns: NS) {
    super(ns, MonitorScript.argsSchema)
  }

  async run(ns: NS = this.ns, logs = this.logs) {
    const { target, repeat } = this.flags as {
      target: string, repeat: number
    }

    while (true) {
      const player = ns.getPlayer()
      try {
        ns.clearLog()

        logs.info(`hacking: ${ns.format.number(player.money)}`)
      }
      catch (error) {
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
