/** copy và chạy script */
const FLAGS: [string, string | number | boolean | string[]][] = [
  ['target', 'pserv'], ['script', ''], ['limit', 20], ['threads', Infinity], ['args', ''], ['run', false]
]

export async function main(ns: NS) {
  ns.disableLog('ALL')
  ns.ui.openTail()

  const flags = ns.flags(FLAGS) as { target: string | null, script: string | null, limit: number, threads: number, run: boolean, args: ScriptArg[] }
  const threads = flags.threads, target = flags.target, script = flags.script, run = flags.run
  const args = flags.args
  const targets = ns.getPurchasedServers()
  const limit = Math.min(flags.limit, targets.length)
  const threadSet = 999999

  if (target == 'pserv') {
    for (const target of targets) {
      if (!target) break
      if (!script) continue
      if (!ns.fileExists(script, 'home')) return
      const scpOk = ns.scp(script, target, 'home')
      if (!scpOk) continue
      ns.print(`[INFO] copy ${script} thành công.`)
    }

    for (let i = 0; i < limit; i++) {
      const target = targets.pop()
      if (!target) break
      await submain(target)
    }
  } else submain(target!)

  async function submain(target: string) {
    if (!target || !script) return ns.print(`[WARN] script hoặc target không được xác định.`)
    try {
      if (!ns.fileExists(script, 'home')) return ns.print(`[WARN] script path không đúng.`)
      if (!run) return
      ns.killall(target)
      const useRam = ns.getServerUsedRam(target)
      const maxRam = ns.getServerMaxRam(target)
      const freeRam = maxRam - useRam

      const perRam = ns.getScriptRam(script, target)
      if (!perRam) return ns.print(`[ERROR] [${script}] check ram không thành công.`)

      const maxThreads = Math.max(0, Math.floor(freeRam / perRam))
      if (maxThreads <= 0) return ns.print(`[WARN] [${target}] không đủ ram.`)
      const useThreads = Math.min(threads, maxThreads)
      var rcheck = useThreads

      for (var i = 0; i < useThreads; i += threadSet) {
        if (rcheck <= 0) break
        var takke = Math.min(threadSet, rcheck)
        if (ns.exec(script, target, takke, ...args) > 0) rcheck -= takke
        await ns.sleep(50)
      }

      const runOk = rcheck > 0 ? false : true
      if (!runOk) { ns.print(`[WARN] [${target}] run [${script}] Fail.`) } else ns.print(`[INFO] [${target}] run [${script}] Done threads[${useThreads}].`)

    } catch (e) {
      ns.ui.openTail()
      ns.print(`[ERROR] : ${e}`)
    }
  }
}

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
  data.flags(FLAGS)
  return [...data.servers, ...data.scripts, ...data.command]
}