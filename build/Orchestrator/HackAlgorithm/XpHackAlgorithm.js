import { DEBUG } from "/Orchestrator/Config/Config";
import { Hack, hackSorter } from "/Orchestrator/Class/Hack";
import { HackType } from "/Orchestrator/Enum/HackEnum";
export function XPHackAlgorithm(ns, currentHack, hackedHost) {
    DEBUG && ns.print("Calculating hacks");
    let potentialHack = [];
    for (let i = 0; i < hackedHost.length; i++) {
        if (hackedHost[i].maxMoney === 0) {
            continue;
        }
        if (currentHack.find(h => h.host == hackedHost[i].name)) {
            continue;
        }
        potentialHack.push(new Hack(hackedHost[i].name, 1, 100, 0, 0, -1, (3 + (hackedHost[i].minSecurity * 0.3)) / hackedHost[i].weakenTime, HackType.xpHack, 1));
    }
    // Sort potentialHack by value.
    potentialHack.sort(hackSorter);
    potentialHack = [potentialHack[0]];
    return potentialHack;
}
