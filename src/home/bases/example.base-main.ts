// scripts/example.ts
import BaseScript from './module.base-script.ts'


export async function main(ns: NS) {
  const script = new ExampleScript(ns)
  await script.run(ns)
}

export function autocomplete(data: AutocompleteData) {
  // gọi static autocomplete() từ BaseScript
  return ExampleScript.autocomplete(data, ExampleScript.argsSchema)
}

class ExampleScript extends BaseScript {
  // --- flags riêng của script con
  static argsSchema: [string, string | number | boolean | string[]][] = [
    ['target', 'n00dles'],
    ['repeat', 1],
  ]

  constructor(ns: NS) {
    super(ns, ExampleScript.argsSchema)
  }

  async run(ns: NS) {
    const { target, repeat } = this.flags
    this.logs.success(`Running ExampleScript | target=${target} | repeat=${repeat}`)

    for (let i = 0; i < repeat; i++) {
      this.logs.info(`(${i + 1}/${repeat}) Hacking ${target}...`)
      await ns.hack(target)
    }

    this.logs.success(`Done hacking ${target}! ✅`)
  }

  // --- autocomplete thêm giá trị gợi ý riêng cho target
  static autocompleteExtra(data: AutocompleteData) {
    return data.servers
  }
}
