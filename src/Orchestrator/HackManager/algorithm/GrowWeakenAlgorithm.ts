import {NS} from "Bitburner";
import {DEBUG, MONEY_HACKING_TARGET_PERCENT} from "/Orchestrator/Config/Config";
import {Hack, HackedHost, hackSorter} from "/Orchestrator/HackManager/hack";
import {HackType} from "/Orchestrator/HackManager/enum";
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
        const moneyToMax = host.maxMoney - hostCurMoney

        // We check if the server is almost fully grown/fully weaken and skip those that are close to the limit
        // if ((hostCurSecurity/host.minSecurity)-1 < 0.25 && hostCurMoney/host.maxMoney < 0.75) {
        //     continue
        // }

        // Thread required to grow to max:
        // max = old*(rate)^thread
        const serverGrowth = Math.min(1 + 0.03 / hostCurSecurity, 1.0035)
        const growThreads = Math.ceil((Math.log(host.maxMoney / hostCurMoney) / (Math.log(serverGrowth)) * host.growRate))

        // We skip those who return NaN orr Infinite
        if (!Number.isFinite(growThreads)) {
            continue
        }

        // Calculate Total Security, considering Grow
        const weakenThread = Math.ceil(((hostCurSecurity - host.minSecurity) + (growThreads * 0.004)) / 0.05)
        // Calculate Hacked Amount per thread
        //const percentHacked = ns.hackAnalyze(hackedHost[i].name)

        const threadsRatio: IThreadRatio = calculateThreadsRatio(availableThreads, hostCurSecurity, host.minSecurity, growThreads, weakenThread)
        const percentGrown: number = growThreads ? threadsRatio.growThreads/growThreads : 1
        const hackAmount: number = hostCurMoney + (moneyToMax * percentGrown) * MONEY_HACKING_TARGET_PERCENT
        const hackTime: number = host.hackTime * 5 // We need to consider the time of the grow/weaken + the time of the hack
        const percentHackedPerThread: number = ns.hackAnalyze(host.name)
        const hackingThreadRequired: number = MONEY_HACKING_TARGET_PERCENT/percentHackedPerThread

        // We also want to skip the hack that would require too few threads
        if (threadsRatio.weakenThreads <= 1 && threadsRatio.growThreads <= 1) {
            continue
        }
        // Save grow/weaken hack
        potentialHack.push(new Hack(
            host.name,
            hackTime,
            hackAmount,
            0,
            threadsRatio.growThreads,
            threadsRatio.weakenThreads,
            ((hackAmount*percentHackedPerThread) / hackTime) * baseHackChance,
            HackType.growWeakenHack,
            baseHackChance
        ))
    }
    // Sort potentialHack by value.

    //DEBUG && ns.print("Got " + potentialHack.length + " hacks")

    return potentialHack
}
