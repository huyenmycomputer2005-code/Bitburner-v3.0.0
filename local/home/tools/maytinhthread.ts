export async function main(ns: NS) {
  const flags = ns.flags([['target', ''], ['script', '']]) as { target: string, script: string }

  const ramScript = ns.getScriptRam(flags.script)
  const server = ns.getServer(flags.target)

  const ramAvi = server.maxRam - server.ramUsed

  ns.tprint(`Threads: ${Math.floor(ramAvi / ramScript)}`)

}
export function autocomplete(data: AutocompleteData, args: any) {
  data.flags([['target', ''], ['script', '']])
  return [...data.servers]
}