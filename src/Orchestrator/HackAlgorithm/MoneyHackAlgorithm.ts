import {NS} from "Bitburner";
import {DEBUG, MONEY_HACKING_TARGET_PERCENT} from "/Orchestrator/Config/Config";
import {Hack, HackedHost, hackSorter} from "/Orchestrator/Class/Hack";
import {HackType} from "/Orchestrator/Enum/HackEnum";

export function MoneyHackAlgorithm(ns: NS, currentHack: Hack[], hackedHost: HackedHost[], availableThreads: number): Hack[] {
    //DEBUG && ns.print("Calculating hacks")
    let potentialHack: Hack[] = []

    for (let i = 0; i < hackedHost.length; i++) {
        if (hackedHost[i].maxMoney === 0) {
            continue
        }

        if (currentHack.find(h => h.host == hackedHost[i].name)) {
            continue
        }

        // Quick hack
        const hostCurMoney: number = ns.getServerMoneyAvailable(hackedHost[i].name)
        const hostCurSecurity: number = ns.getServerSecurityLevel(hackedHost[i].name)
        const maxHackAmount: number = hostCurMoney * MONEY_HACKING_TARGET_PERCENT
        const hackThreads: number = Math.ceil(ns.hackAnalyzeThreads(hackedHost[i].name, maxHackAmount))
        const hackPercentage: number = hackThreads/availableThreads > 1 ? 1 : hackThreads/availableThreads
        const hackAmount: number = maxHackAmount * hackPercentage
        const baseHackChance: number = ((1.75 * ns.getHackingLevel()) - hackedHost[i].hackingRequired)/(1.75 * ns.getHackingLevel())
        const hackChance: number = (100-hostCurSecurity)/100*baseHackChance

        // We need to ensure that it return a valid number of thread for the hack
        if (Number.isFinite(hackThreads) && hackThreads > 0) {
            potentialHack.push(new Hack(
                hackedHost[i].name,
                hackedHost[i].hackTime,
                hackAmount,
                hackThreads,
                0,
                0,
                hackAmount / hackedHost[i].hackTime*hackChance,
                HackType.moneyHack,
                hackChance
            ))
        }
    }
    // Sort potentialHack by value.
    //potentialHack.sort(hackSorter)

    //DEBUG && ns.print("Got " + potentialHack.length + " quick hacks")

    return potentialHack
}
