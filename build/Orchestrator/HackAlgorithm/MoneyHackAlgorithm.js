import { MONEY_HACKING_TARGET_PERCENT } from "/Orchestrator/Config/Config";
import { Hack } from "/Orchestrator/Class/Hack";
import { HackType } from "/Orchestrator/Enum/HackEnum";
export function MoneyHackAlgorithm(ns, currentHack, hackedHost, availableThreads) {
    //DEBUG && ns.print("Calculating hacks")
    let potentialHack = [];
    for (let i = 0; i < hackedHost.length; i++) {
        if (hackedHost[i].maxMoney === 0) {
            continue;
        }
        if (currentHack.find(h => h.host == hackedHost[i].name)) {
            continue;
        }
        // Quick hack
        const hostCurMoney = ns.getServerMoneyAvailable(hackedHost[i].name);
        const hostCurSecurity = ns.getServerSecurityLevel(hackedHost[i].name);
        const maxHackAmount = hostCurMoney * MONEY_HACKING_TARGET_PERCENT;
        const hackThreads = Math.ceil(ns.hackAnalyzeThreads(hackedHost[i].name, maxHackAmount));
        const hackPercentage = hackThreads / availableThreads > 1 ? 1 : hackThreads / availableThreads;
        const hackAmount = maxHackAmount * hackPercentage;
        const baseHackChance = ((1.75 * ns.getHackingLevel()) - hackedHost[i].hackingRequired) / (1.75 * ns.getHackingLevel());
        const hackChance = (100 - hostCurSecurity) / 100 * baseHackChance;
        // We need to ensure that it return a valid number of thread for the hack
        if (Number.isFinite(hackThreads) && hackThreads > 0) {
            potentialHack.push(new Hack(hackedHost[i].name, hackedHost[i].hackTime, hackAmount, hackThreads, 0, 0, hackAmount / hackedHost[i].hackTime * hackChance, HackType.moneyHack, hackChance));
        }
    }
    // Sort potentialHack by value.
    //potentialHack.sort(hackSorter)
    //DEBUG && ns.print("Got " + potentialHack.length + " quick hacks")
    return potentialHack;
}
