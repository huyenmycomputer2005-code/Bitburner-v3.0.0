export async function main(ns: NS) {
  ns.disableLog("ALL");
  if (!ns.gang.inGang()) {
    joinGang(ns);
  }

  tasks = ns.gang.getTaskNames();
  augmentationNames = ns.gang.getEquipmentNames();

  var territoryWinChance = 1;

  while (true) {
    ns.clearLog();
    recruit(ns);
    equipMembers(ns);
    ascend(ns);
    territoryWinChance = territoryWar(ns);
    assignMembers(ns, territoryWinChance);
    await ns.sleep(2000);
  }
}

var tasks: string[] = []
var augmentationNames: string[] = []
const combatGangs = [
  "Speakers for the Dead", "The Dark Army", "The Syndicate", "Tetrads", "Slum Snakes"
];
const hackingGangs = ["NiteSec", "The Black Hand"];

function territoryWar(ns: NS) {
  const minWinChanceToStartWar = 0.8;
  let gangInfo = ns.gang.getGangInformation();

  ns.print(`Respect: ${ns.format.number(gangInfo.respect)} (${ns.format.number(gangInfo.respectGainRate)})`);
  ns.print(`Wanted Level: ${gangInfo.wantedLevel} (${ns.format.number(gangInfo.wantedLevelGainRate)})`);
  ns.print(`Wanted Level Penalty: ${ns.format.percent(gangInfo.wantedPenalty)}`);
  ns.print(`Money gainrate: ${ns.format.number(gangInfo.moneyGainRate)}`);
  ns.print(`Territory: ${ns.format.percent(gangInfo.territory)}`);
  ns.print(` `);

  // sometimes territory is stuck at something like 99.99999999999983%
  // since clash chance takes time to decrease anyways, should not be an issue to stop a bit before 100,000000%
  if (gangInfo.territory < 0.9999) {
    let otherGangInfos = ns.gang.getOtherGangInformation();
    let myGangPower = gangInfo.power;
    ns.print(`My gang power: ${ns.format.number(myGangPower)}`);
    let lowestWinChance = 1;
    for (const otherGang of combatGangs.concat(hackingGangs)) {
      if (otherGang == gangInfo.faction) {
        continue;
      }
      else if (otherGangInfos[otherGang].territory <= 0) {
        continue;
      }
      else {
        let otherGangPower = otherGangInfos[otherGang].power;
        let winChance = myGangPower / (myGangPower + otherGangPower);
        lowestWinChance = Math.min(lowestWinChance, winChance);
      }
    }
    if (lowestWinChance > minWinChanceToStartWar) {
      if (!gangInfo.territoryWarfareEngaged) {
        ns.print("WARN bắt đầu chiến tranh lãnh thổ");
        ns.toast("Bắt đầu chiến tranh lãnh thổ");
        ns.gang.setTerritoryWarfare(true);
      }
      ns.print(`Cơ hội chiếm lãnh thổ: ${ns.format.percent(lowestWinChance)}`);
    }
    return lowestWinChance;
  }

  if (gangInfo.territoryWarfareEngaged) {
    ns.print("WARN chấm dứt chiến tranh lãnh thổ");
    ns.toast("Chấm dứt chiến tranh lãnh thổ");
    ns.gang.setTerritoryWarfare(false);
  }
  return 1;
}

function ascend(ns: NS) {
  let members = ns.gang.getMemberNames();
  for (let member of members) {
    let memberInfo = ns.gang.getMemberInformation(member);
    let memberCombatStats = (memberInfo.str + memberInfo.def + memberInfo.dex + memberInfo.agi) / 4;
    //ns.print("Member combat stats: " + memberCombatStats);
    let memberAscensionMultiplier = (memberInfo.agi_asc_mult + memberInfo.def_asc_mult + memberInfo.dex_asc_mult + memberInfo.str_asc_mult) / 4;
    //ns.print("Member ascension multiplier: " + memberAscensionMultiplier);
    let memberAscensionResult = ns.gang.getAscensionResult(member);
    if (memberAscensionResult !== undefined) {
      let memberAscensionResultMultiplier = (memberAscensionResult.agi + memberAscensionResult.def + memberAscensionResult.dex + memberAscensionResult.str) / 4;
      //ns.print("Member ascension result: " + memberNewAscensionMultiplier);
      if ((memberAscensionResultMultiplier > 1.3)) {
        ns.print("Thành viên Ascent: " + member);
        ns.gang.ascendMember(member);
      }
    }
  }
}

function equipMembers(ns: NS) {
  let members = ns.gang.getMemberNames();
  for (let member of members) {
    let memberInfo = ns.gang.getMemberInformation(member);
    const numUpgrade = [...memberInfo.augmentations, ...memberInfo.upgrades]
    if (numUpgrade.length < augmentationNames.length) {
      for (let augmentation of augmentationNames) {
        if (numUpgrade.includes(augmentation)) continue
        if (ns.gang.getEquipmentCost(augmentation) < (0.1 * ns.getServerMoneyAvailable("home"))) {
          ns.print("Tăng cường cho " + member + ": " + augmentation);
          ns.gang.purchaseEquipment(member, augmentation);
        }
      }
    }
  }
}

function assignMembers(ns: NS, territoryWinChance: number) {
  let members = ns.gang.getMemberNames();
  members.sort((a, b) => memberCombatStats(ns, b) - memberCombatStats(ns, a));
  let gangInfo = ns.gang.getGangInformation();
  let workJobs = Math.floor((members.length) / 2);
  let wantedLevelIncrease = 0;
  for (let member of members) {
    let highestTaskValue = 0;
    let highestValueTask = "Train Combat";
    let memberInfo = ns.gang.getMemberInformation(member);

    if (workJobs > 0 && gangInfo.territory < 1 && members.length >= 12 && territoryWinChance < 0.95) {
      // support territory warfare if max team size, not at max territory yet and win chance not high enough yet
      workJobs--;
      highestValueTask = "Territory Warfare";
    }
    else if (memberCombatStats(ns, member) < 50) {
      highestValueTask = "Train Combat";
    }
    else if (workJobs >= 0 && wantedLevelIncrease > 0) {
      workJobs--;
      highestValueTask = "Vigilante Justice";
      //ns.print("Wanted Level for Vigilante: " + ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(highestValueTask)))
      wantedLevelIncrease += ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(highestValueTask));
    }
    else if (workJobs > 0 && memberCombatStats(ns, member) > 50) {
      workJobs--;
      for (const task of tasks) {
        if (taskValue(ns, gangInfo, member, task) > highestTaskValue) {
          highestTaskValue = taskValue(ns, gangInfo, member, task)
          highestValueTask = task;
        }
      }
      wantedLevelIncrease += ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(highestValueTask));
      //ns.print("Wanted Level for Increase: " + ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(highestValueTask)))
    }


    if (memberInfo.task != highestValueTask) {
      ns.print("Giao phó: " + member + " -> " + highestValueTask);
      ns.gang.setMemberTask(member, highestValueTask);
    }
  }
}

function taskValue(ns: NS, gangInfo: GangGenInfo, member: string, task: string) {
  // determine money and reputation gain for a task
  let respectGain = ns.formulas.gang.respectGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(task));
  let moneyGain = ns.formulas.gang.moneyGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(task));
  let wantedLevelIncrease = ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(task));
  let vigilanteWantedDecrease = ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats("Vigilante Justice"));
  if (wantedLevelIncrease + vigilanteWantedDecrease > 0) {
    // avoid tasks where more than one vigilante justice is needed to compensate
    return 0;
  }
  else if ((2 * wantedLevelIncrease) + vigilanteWantedDecrease > 0) {
    // Simple compensation for wanted level since we need more vigilante then
    // ToDo: Could be a more sophisticated formula here
    moneyGain *= 0.75;
  }

  if (ns.getServerMoneyAvailable("home") > 100e9) {
    // nếu chúng ta nhận được tất cả các khoản tăng thêm, tiền từ các băng đảng có lẽ không còn phù hợp nữa; vì vậy hãy tập trung vào sự tôn trọng
    // đặt mức tăng tiền ít nhất là tôn trọng mức tăng trong trường hợp các nhiệm vụ kiếm tiền thấp như khủng bố
    moneyGain /= 100; // so sánh tiền bạc để tôn trọng giá trị đạt được; ưu tiên sự tôn trọng hơn
    moneyGain = Math.max(moneyGain, respectGain);
  }

  // return a value based on money gain and respect gain
  return respectGain * moneyGain;
}

function memberCombatStats(ns: NS, member: string) {
  let memberInfo = ns.gang.getMemberInformation(member);
  return (memberInfo.str + memberInfo.def + memberInfo.dex + memberInfo.agi) / 4;
}


function recruit(ns: NS) {
  if (ns.gang.canRecruitMember()) {
    let members = ns.gang.getMemberNames();
    let memberName = "BitTool-" + members.length;
    ns.print("Tuyển thành viên " + memberName);
    ns.gang.recruitMember(memberName);
  }
}

function joinGang(ns: NS) {

  for (const myGang of combatGangs) {
    if (ns.gang.createGang(myGang as FactionName)) {
      return;
    }
  }
}