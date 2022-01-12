import {NS} from "Bitburner";
import {HackType} from "/Orchestrator/Enum/HackEnum";

interface IHack {
   host: string
    hackTime: number
    hackValue: number
    hackThreads: number
    growThreads: number
    weakenThreads: number
    relativeValue: number
    hackType: HackType
    hackChance: number
    id: number|null
}

export class Hack implements IHack {
    host: string
    hackTime: number
    hackValue: number
    hackThreads: number
    growThreads: number
    weakenThreads: number
    relativeValue: number
    hackType: HackType
    hackChance: number
    id: number|null

    constructor(
        host: string,
        hackTime: number,
        hackValue: number,
        hackThreads: number,
        growThreads: number,
        weakenThreads: number,
        relativeValue: number,
        hackType: HackType,
        hackChance: number
    ) {
        this.host = host
        this.hackTime = hackTime
        this.hackValue = hackValue
        this.hackThreads = hackThreads
        this.growThreads = growThreads
        this.weakenThreads = weakenThreads
        this.relativeValue = relativeValue
        this.hackType = hackType
        this.hackChance = hackChance
        this.id = null
    }

    get growTime(): number {
        return this.hackTime * 3.2
    }

    get weakenTime(): number {
        return this.hackTime * 4
    }

    static fromJSON(json: string): Hack {
        const {host, hackTime, hackValue, hackThreads, growThreads, weakenThreads, relativeValue, hackType, hackChance}: IHack = JSON.parse(json)
        return new Hack(host, hackTime, hackValue, hackThreads, growThreads, weakenThreads, relativeValue, hackType, hackChance)
    }
}

export class HackedHost {
    name: string
    hackTime: number
    growRate: number
    minSecurity: number
    maxMoney: number
    ram: number
    hackingRequired: number

    constructor(ns: NS, host: string) {
        this.name = host
        this.hackTime = ns.getHackTime(host)
        this.growRate = ns.getServerGrowth(host)/100
        this.minSecurity = ns.getServerMinSecurityLevel(host)
        this.maxMoney = ns.getServerMaxMoney(host)
        this.ram = ns.getServerMaxRam(host)
        this.hackingRequired = ns.getServerRequiredHackingLevel(host)
    }

    get growTime(): number {
        return this.hackTime * 3.2
    }
    get weakenTime(): number {
        return this.hackTime * 4
    }
}

// export const hackSorter = (a: Hack, b: Hack): number => {
//     if (a.hackTime < b.hackTime) {
//         return -1
//     }
//     if (a.hackTime > b.hackTime) {
//         return 1
//     }
//     return 0
// }

export const hackSorter = (a: Hack, b: Hack): number => {
    if (a.relativeValue < b.relativeValue) {
        return 1
    }
    if (a.relativeValue > b.relativeValue) {
        return -1
    }
    return 0
}