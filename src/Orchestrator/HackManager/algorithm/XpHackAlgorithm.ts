import {NS} from "Bitburner";
import {Hack, HackedHost, hackSorter} from "/Orchestrator/HackManager/hack";
import {HackType} from "/Orchestrator/HackManager/enum";
import {DEBUG} from "/Orchestrator/Config/Debug";

export function XPHackAlgorithm(ns: NS, currentHack: Hack[], hackedHost: HackedHost[]): Hack[] {
    let potentialHack: Hack[] = []

    for (let host of hackedHost) {
        if (host.maxMoney===0) {
            continue
        }

        if (currentHack.find(h => h.host === host.name)) {
            continue
        }

        potentialHack.push(new Hack(
            host.name,
            1,
            100,
            0,
            0,
            -1,
            (3 + (host.minSecurity * 0.3)) / host.weakenTime,
            HackType.xpHack,
            0
        ))
    }

    // Sort potentialHack by value.
    potentialHack.sort(hackSorter)

    // XP hack need only one hack
    potentialHack = potentialHack[0] ? [potentialHack[0]] : []

    return potentialHack
}


