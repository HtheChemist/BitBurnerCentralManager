import {NS} from "Bitburner";
import {DEBUG, MONEY_HACKING_TARGET_PERCENT} from "/Orchestrator/Config/Config";
import {Hack, HackedHost, hackSorter} from "/Orchestrator/Class/Hack";
import {HackType} from "/Orchestrator/Enum/HackEnum";

export function MoneyHackAlgorithm(ns: NS, currentHack: Hack[], hackedHost: HackedHost[], availableThreads: number): Hack[] {
    //DEBUG && ns.print("Calculating hacks")
    let potentialHack: Hack[] = []

    for (const host of hackedHost) {
        if (host.maxMoney === 0) {
            continue
        }

        if (currentHack.find(h => h.host == host.name)) {
            continue
        }

        // Quick hack
        const hostCurMoney: number = ns.getServerMoneyAvailable(host.name)
        const hostCurSecurity: number = ns.getServerSecurityLevel(host.name)
        const maxHackAmount: number = hostCurMoney * MONEY_HACKING_TARGET_PERCENT
        const hackThreads: number = Math.ceil(ns.hackAnalyzeThreads(host.name, maxHackAmount))
        const finalHackThreads: number = Math.min(hackThreads, availableThreads)
        const hackPercentage: number = hackThreads/availableThreads > 1 ? 1 : hackThreads/availableThreads
        const hackAmount: number = maxHackAmount * hackPercentage
        const baseHackChance: number = ((1.75 * ns.getHackingLevel()) - host.hackingRequired)/(1.75 * ns.getHackingLevel())
        const hackChance: number = (100-hostCurSecurity)/100*baseHackChance
        const hackPerThread: number = ns.hackAnalyze(host.name)

        // We skip those that are not high enough
        // if (hostCurMoney/host.maxMoney < 0.75) {
        //     continue
        // }

        // We need to ensure that it return a valid number of thread for the hack
        if (Number.isFinite(finalHackThreads) && hackThreads > 0) {
            potentialHack.push(new Hack(
                host.name,
                host.hackTime,
                hackAmount,
                finalHackThreads,
                0,
                0,
                (hackAmount*hackPerThread) / host.hackTime * hackChance,
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
