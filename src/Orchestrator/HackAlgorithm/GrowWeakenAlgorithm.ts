import {NS} from "Bitburner";
import {DEBUG, MONEY_HACKING_TARGET_PERCENT} from "/Orchestrator/Config/Config";
import {Hack, HackedHost, hackSorter} from "/Orchestrator/Class/Hack";
import {HackType} from "/Orchestrator/Enum/HackEnum";
import {calculateThreadsRatio, IThreadRatio} from "/Orchestrator/Common/GenericFunctions";

export function GrowWeakenAlgorithm(ns: NS, currentHack: Hack[], hackedHost: HackedHost[], availableThreads: number): Hack[] {
    //DEBUG && ns.print("Calculating hacks")
    let potentialHack: Hack[] = []

    for (let host of hackedHost) {
        if (host.maxMoney === 0) {
            continue
        }

        if (currentHack.find(h => h.host == host.name)) {
            continue
        }

        const hostCurMoney = ns.getServerMoneyAvailable(host.name)
        const hostCurSecurity = ns.getServerSecurityLevel(host.name)
        const baseHackChance: number = ((1.75 * ns.getHackingLevel()) - host.hackingRequired)/(1.75 * ns.getHackingLevel())

        // Thread required to grow to max:
        // max = old*(rate)^thread
        const serverGrowth = Math.min(1 + 0.03 / hostCurSecurity, 1.0035)
        const growThreads = Math.ceil((Math.log(host.maxMoney / hostCurMoney) / Math.log(serverGrowth)) / host.growRate)

        // We skip those who return NaN orr Infinite
        if (!Number.isFinite(growThreads)) {
            continue
        }

        // Calculate Total Security, considering Grow
        const weakenThread = Math.ceil(((hostCurSecurity - host.minSecurity) + (growThreads * 0.004)) / 0.05)
        // Calculate Hacked Amount per thread
        //const percentHacked = ns.hackAnalyze(hackedHost[i].name)

        const threadsRatio: IThreadRatio = calculateThreadsRatio(availableThreads, hostCurSecurity, host.minSecurity, growThreads, weakenThread)
        const percentHacked: number = growThreads ? threadsRatio.growThreads/growThreads : 1
        const hackAmount: number = host.maxMoney * percentHacked * MONEY_HACKING_TARGET_PERCENT
        const hackTime = host.hackTime * 5 // We need to consider the time of the grow/weaken + the time of the hack

        // We check if the server is fully grown/fully weaken
        if (threadsRatio.weakenThreads <= 1 && threadsRatio.growThreads <= 1) {
            continue
        }

        // Save grow/weaken hack
        potentialHack.push(new Hack(
            host.name,
            hackTime,
            hackAmount, // We aim for 95%
            0,
            threadsRatio.growThreads,
            threadsRatio.weakenThreads,
            hackAmount / hackTime * baseHackChance,
            HackType.growWeakenHack,
            baseHackChance
        ))
    }
    // Sort potentialHack by value.

    //DEBUG && ns.print("Got " + potentialHack.length + " hacks")

    return potentialHack
}
