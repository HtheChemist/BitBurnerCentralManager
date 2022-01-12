import { DEBUG } from "/Orchestrator/Config/Config";
import { Hack, hackSorter } from "/Orchestrator/Class/Hack";
import { HackType } from "/Orchestrator/Enum/HackEnum";
export function MoneyHackAlgorithm(ns, currentHack, hackedHost) {
    DEBUG && ns.print("Calculating hacks");
    let potentialHack = [];
    for (let i = 0; i < hackedHost.length; i++) {
        if (hackedHost[i].maxMoney === 0) {
            continue;
        }
        if (currentHack.find(h => h.host == hackedHost[i].name)) {
            continue;
        }
        const hostCurMoney = ns.getServerMoneyAvailable(hackedHost[i].name);
        const hostCurSecurity = ns.getServerSecurityLevel(hackedHost[i].name);
        // Quick hack
        // We need to ensure that it return a valid number of thread for the hack
        let tr = ns.hackAnalyzeThreads(hackedHost[i].name, hostCurMoney * 0.5);
        let baseHackChance = ((1.75 * ns.getHackingLevel()) - hackedHost[i].hackingRequired) / (1.75 * ns.getHackingLevel());
        if (Number.isFinite(tr) && tr > 0) { //} && (100-hackedHost[i].minSecurity)/100*baseHackChance > 0.5) {
            potentialHack.push(new Hack(hackedHost[i].name, hackedHost[i].hackTime, hostCurMoney * 0.5, // We aim for 50%
            Math.ceil(tr), 0, Math.ceil((hostCurSecurity - hackedHost[i].minSecurity) / 0.005), hostCurMoney * 0.5 / hackedHost[i].hackTime, HackType.quickMoneyHack, (100 - hostCurSecurity) / 100 * baseHackChance));
        }
        // Full hack
        // Thread required to grow to max:
        // max = old*(rate)^thread
        const serverGrowth = Math.min(1 + 0.03 / hostCurSecurity, 1.0035);
        const growThread = Math.ceil((Math.log(hackedHost[i].maxMoney / hostCurMoney) / Math.log(serverGrowth)) / hackedHost[i].growRate);
        if (!Number.isFinite(growThread) || growThread == 0) {
            continue;
        }
        // Calculate Total Security, considering Grow
        const weakenThread = Math.ceil(((hostCurSecurity - hackedHost[i].minSecurity) + (growThread * 0.004)) / 0.005);
        // Calculate Hacked Amount
        const percentHacked = ns.hackAnalyze(hackedHost[i].name);
        // Save full hack
        potentialHack.push(new Hack(hackedHost[i].name, hackedHost[i].maxMoney * 0.5, // We aim for 50%
        hackedHost[i].hackTime * 5, Math.ceil((hackedHost[i].maxMoney * 0.5) / (percentHacked * hackedHost[i].maxMoney)), growThread, weakenThread, hackedHost[i].maxMoney * 0.5 / hackedHost[i].hackTime * 5, HackType.fullMoneyHack, (100 - hackedHost[i].minSecurity) / 100 * baseHackChance));
    }
    // Sort potentialHack by value.
    potentialHack.sort(hackSorter);
    DEBUG && ns.print("Got " + potentialHack.length + " hacks");
    //DEBUG && ns.print("Got " + potentialHack.filter(hack => hack.hackType === HackType.quickMoneyHack).length + " quick hack")
    //DEBUG && ns.print("Got " + potentialHack.filter(hack => hack.hackType === HackType.fullMoneyHack).length + " full hack")
    return potentialHack;
}
