function recursiveScan(ns: NS, parent: string, server: string, target: string, route: string[]) {
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

    if (recursiveScan(ns, server, child, target, route)) {
      route.unshift(server);
      return true;
    }
  }
  return false;
}

export async function main(ns: NS) {
  ns.disableLog('ALL')
  ns.ui.openTail()

  const args = ns.flags([
    ["help", false], ['target', 'n00dles'], ['p', false]
  ]) as {
    help: boolean, p: boolean, target: string
  };

  let route: string[] = [];
  let server = args.target;
  let view_path_only = args.p;
  if (!server || args.help) {
    ns.tprint("This script helps you find a server on the network and shows you the path to get to it.");
    ns.tprint(`Usage: run ${ns.getScriptName()} SERVER`);
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} --target n00dles`);
    return;
  }

  recursiveScan(ns, '', 'home', server, route);
  ns.print(route)
  if (!view_path_only) {
    ns.print("connect ", route.join("; connect "), "; backdoor")
  } else {
    for (const i of route) {
      // ns.print(i)
      ns.singularity.connect(i)
    }
  }
}

export function autocomplete(data: AutocompleteData, args: any) {
  data.flags([["help", false], ['target', 'n00dles'], ['p', false]])
  return data.servers;
}