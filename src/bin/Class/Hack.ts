import {NS} from "Bitburner";
import {HackType} from "../Enum/HackEnum";

export class Hack {
    host: string
    hackTime: number
    hackValue: number
    hackThreads: number
    growThreads: number
    weakenThreads: number
    relativeValue: number
    hackType: HackType
    id: number|null

    constructor(
        host: string,
        hackTime: number,
        hackValue: number,
        hackThreads: number,
        growThreads: number,
        weakenThreads: number,
        relativeValue: number,
        hackType: HackType
    ) {
        this.host = host
        this.hackTime = hackTime
        this.hackValue = hackValue
        this.hackThreads = hackThreads
        this.growThreads = growThreads
        this.weakenThreads = weakenThreads
        this.relativeValue = relativeValue
        this.hackType = hackType
        this.id = null
    }

    get growTime(): number {
        return this.hackTime * 3.2
    }

    get weakenTime(): number {
        return this.hackTime * 4
    }
}

export class HackedHost {
    name: string
    hackTime: number
    growRate: number
    minSecurity: number
    curSecurity: number
    maxMoney: number
    curMoney: number
    ram: number
    hackingRequired: number

    constructor(ns: NS, host: string) {
        this.name = host
        this.hackTime = ns.getHackTime(host)
        this.growRate = ns.getServerGrowth(host)/100
        this.minSecurity = ns.getServerMinSecurityLevel(host)
        this.curSecurity = ns.getServerSecurityLevel(host)
        this.maxMoney = ns.getServerMaxMoney(host)
        this.curMoney = ns.getServerMoneyAvailable(host)
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

export const hackSorter = (a: Hack, b: Hack): number => {
    if (a.relativeValue < b.relativeValue) {
        return 1
    }
    if (a.relativeValue > b.relativeValue) {
        return -1
    }
    return 0
}