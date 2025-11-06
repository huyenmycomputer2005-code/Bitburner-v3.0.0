// manager.main.ts
import BaseScript from '../modules/module.base-script.ts'

export async function main(ns: NS) {
  const script = new ManagerScript(ns)
  await script.run()
}

export function autocomplete(data: AutocompleteData) {
  // gọi static autocomplete() từ BaseScript
  return ManagerScript.autocomplete(data, ManagerScript.argsSchema)
}

class ManagerScript extends BaseScript {
  // --- flags riêng của script con
  static argsSchema: [string, string | number | boolean | string[]][] = [
    ['target', 'n00dles'], ['repeat', 1]
  ]

  constructor(ns: NS) {
    super(ns, ManagerScript.argsSchema)
  }

  async run(ns: NS = this.ns) {
    const { target, repeat } = this.flags as {
      target: string, repeat: number
    }

    try {
      const player = this.ns.getPlayer()

    } catch (error) {
      this.logs.error(`${error}`)
      this.logs.error(`Script ${this.ns.getScriptName()} run fail! ❎`)
      this.ns.ui.openTail()
    }

    this.logs.success(`Script ${this.ns.getScriptName()} run done! ✅`)
  }

  // --- autocomplete thêm giá trị gợi ý riêng cho target
  static autocompleteExtra(data: AutocompleteData) {
    return []
  }
}
