import BaseScript from "../bases/module.base-script";

export async function main(ns: NS) {
  const script = new backdoor_script(ns);
  await script.run();
}

export function autocomplete(data: AutocompleteData) {
  return backdoor_script.autocomplete(data, backdoor_script.argsSchema)
}

class backdoor_script extends BaseScript {
  static argsSchema: [string, string | number | boolean | string[]][] = [
    ['target', ''], ['r', false]
  ];

  private backdoor_list: string[] = ['CSEC', 'avmnite-02h', 'I.I.I.I', 'run4theh111z']

  constructor(ns: NS) {
    super(ns, backdoor_script.argsSchema);
  }

  async run(ns: NS = this.ns): Promise<void> {
    const { target, r: run } = this.flags as {
      target: string, r: boolean
    }

    if (!target) return
    if (target.toLowerCase() === 'all' && run) {
      for (const target of this.backdoor_list) {
        const server = ns.getServer(target);
        const player = ns.getPlayer();
        if (server.backdoorInstalled! || server.requiredHackingSkill! > player.skills.hacking) continue
        const route: string[] = [];
        this.recursiveScan('', 'home', target, route);
        if (!server.backdoorInstalled! && server.requiredHackingSkill! <= player.skills.hacking) {
          if (ns.fileExists('Formulas.exe', 'home')) {
            for (const host of route) {
              ns.singularity.connect(host);
            }
            await ns.singularity.installBackdoor();
          } else {
            this.logs.info(`connect ${route.join('; connect ')}; backdoor`);
          }
        }
      }
    } else {
      const route: string[] = [];
      this.recursiveScan('', 'home', target, route);
      this.logs.info(`connect ${route.join('; connect ')}; backdoor`);
    }
  }

  private recursiveScan(parent: string, server: string, target: string, route: string[], ns: NS = this.ns) {
    const children = ns.scan(server);
    for (let child of children) {
      if (parent == child) {
        continue;
      }
      if (child == target) {
        route.unshift(child);
        route.unshift(server);
        return true;
      }
      if (this.recursiveScan(server, child, target, route)) {
        route.unshift(server);
        return true;
      }
    }
    return false;
  }

  static autocompleteExtra(data: AutocompleteData): string[] {
    return data.servers;
  }
}