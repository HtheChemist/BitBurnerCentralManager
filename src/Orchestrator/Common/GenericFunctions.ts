import {NS} from "Bitburner";
import {ThreadsList} from "/Orchestrator/ThreadManager/manager";
import {Action, ChannelName} from "/Orchestrator/MessageManager/enum";
import {Message, MessageHandler, Payload} from "/Orchestrator/MessageManager/class";
import {KILL_MESSAGE} from "/Orchestrator/Config/Config";
import {Hack} from "/Orchestrator/HackManager/hack";
import {freeThreads} from "/Orchestrator/ThreadManager/common";
import {dprint} from "/Orchestrator/Common/Dprint";

export async function copyFile(ns: NS, fileList: string[], host) {
    for (let j = 0; j < fileList.length; j++) {
        const script: string = fileList[j]
        ns.fileExists(script, host) && ns.rm(script, host)
        await ns.scp(script, "home", host);
    }
}

export async function executeScript(ns: NS, script: string, threads: ThreadsList, hack: Hack, messageHandler: MessageHandler, id: number): Promise<number> {
    dprint(ns,"Executing scripts: " + script)
    let executedScript = 0
    for (const host of Object.keys(threads)) {
        if (threads[host] === 0) continue
        const pid = ns.exec(script, host, threads[host], hack.host, id, executedScript)
        if (pid > 0) {
            executedScript++
        } else {
            dprint(ns, "Hack " + id + " targeting " + hack.host + " could not start script on " + host + " with " + threads[host] + " threads.")
            await freeThreads(ns, {[host]: threads[host]}, messageHandler)
        }
    }
    return executedScript
}

export async function checkForKill(ns: NS, messageHandler: MessageHandler): Promise<boolean> {
    const killMessage: Message[] = await messageHandler.getMessagesInQueue(KILL_MESSAGE)
    if (killMessage.length > 0) {
        dprint(ns,"Kill request")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, "Killed"))
        return true
    }
    return false
}


export function formatMoney(n: number, decimalPlaces = 3): string {
    const levels: number[] = [1e30, 1e27, 1e24, 1e21, 1e18, 1e15, 1e12, 1e9, 1e6, 1e3]
    const notations: string[] = ["n", "o", "S", "s", "Q", "q", "t", "b", "m", "k"]

    if (n === Infinity) return "∞";

    for (const [index, level] of levels.entries()) {
        if (n>=level) {
            const number = Math.round((n/level)*(Math.pow(10,decimalPlaces)))/(10*decimalPlaces)
            return number + notations[index] + "$"
        }
    }
    return n + "$"
}

