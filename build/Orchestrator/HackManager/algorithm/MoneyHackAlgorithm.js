import { MONEY_HACKING_TARGET_PERCENT } from "/Orchestrator/Config/Config";
import { Hack } from "/Orchestrator/HackManager/hack";
import { HackType } from "/Orchestrator/HackManager/enum";
export function MoneyHackAlgorithm(ns, currentHack, hackedHost, availableThreads) {
    //DEBUG && ns.print("Calculating hacks")
    let potentialHack = [];
    for (const host of hackedHost) {
        if (host.maxMoney === 0) {
            continue;
        }
        if (currentHack.find(h => h.host == host.name)) {
            continue;
        }
        // Quick hack
        const hostCurMoney = ns.getServerMoneyAvailable(host.name);
        const hostCurSecurity = ns.getServerSecurityLevel(host.name);
        const maxHackAmount = hostCurMoney * MONEY_HACKING_TARGET_PERCENT;
        const hackThreads = Math.ceil(ns.hackAnalyzeThreads(host.name, maxHackAmount));
        const finalHackThreads = Math.min(hackThreads, availableThreads);
        const hackPercentage = hackThreads / availableThreads > 1 ? 1 : hackThreads / availableThreads;
        const hackAmount = maxHackAmount * hackPercentage;
        const baseHackChance = ((1.75 * ns.getHackingLevel()) - host.hackingRequired) / (1.75 * ns.getHackingLevel());
        const hackChance = (100 - hostCurSecurity) / 100 * baseHackChance;
        const hackPerThread = ns.hackAnalyze(host.name);
        // We skip those that are not high enough
        // if (hostCurMoney/host.maxMoney < 0.75) {
        //     continue
        // }
        // We need to ensure that it return a valid number of thread for the hack
        if (Number.isFinite(finalHackThreads) && hackThreads > 0) {
            potentialHack.push(new Hack(host.name, host.hackTime, hackAmount, finalHackThreads, 0, 0, (hackAmount * hackPerThread) / host.hackTime * hackChance, HackType.moneyHack, hackChance));
        }
    }
    // Sort potentialHack by value.
    //potentialHack.sort(hackSorter)
    //DEBUG && ns.print("Got " + potentialHack.length + " quick hacks")
    return potentialHack;
}
