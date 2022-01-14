import {NS} from "Bitburner";
import {ThreadsList} from "/Orchestrator/Manager/ThreadManager";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {Message, MessageHandler, Payload} from "/Orchestrator/Class/Message";
import {HackType} from "/Orchestrator/Enum/HackEnum";
import {DEBUG, KILL_MESSAGE} from "/Orchestrator/Config/Config";
import {Hack} from "/Orchestrator/Class/Hack";

export async function copyFile(ns: NS, fileList: string[], host) {
    for (let j = 0; j < fileList.length; j++) {
        const script: string = fileList[j]
        ns.fileExists(script, host) && ns.rm(script, host)
        await ns.scp(script, "home", host);
    }
}

export async function getThreads(ns: NS, amount: number, messageHandler: MessageHandler, hack: Hack): Promise<ThreadsList> {
    await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.getThreads, amount, hack.hackType !== HackType.quickMoneyHack))
    const response: Message[] = await messageHandler.waitForAnswer(m => m.payload.action === Action.threads)
    DEBUG && ns.print("Got threads: ")
    DEBUG && ns.print(response[0].payload.info)
    return response[0].payload.info as ThreadsList
}

export async function executeScript(ns: NS, script: string, threads: ThreadsList, hack: Hack, messageHandler: MessageHandler, id: number): Promise<number> {
    DEBUG && ns.print("Executing scripts")
    let executedScript = 0
    for (let i = 0; i < Object.keys(threads).length; i++) {
        const keyName = Object.keys(threads)[i]
        const pid = ns.exec(script, keyName, threads[keyName], hack.host, id)
        if (pid > 0) {
            executedScript++
        } else {
            ns.tprint("Hack " + hack.id + " targeting " + hack.host + " could not start script on " + keyName + " with " + threads[keyName] + " threads.")
            await freeThreads(ns,{keyName: threads[keyName]}, messageHandler)
        }
    }
    return executedScript
}

export async function freeThreads(ns: NS, allocatedThreads: ThreadsList, messageHandler: MessageHandler) {
    DEBUG && ns.print("Freeing threads")
    await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.freeThreads, allocatedThreads))
}

export async function checkForKill(ns: NS, messageHandler: MessageHandler): Promise<boolean> {
    const killMessage: Message[] = await messageHandler.getMessagesInQueue(KILL_MESSAGE)
    if (killMessage.length > 0) {
        DEBUG && ns.print("Kill request")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, "Killed"))
        return true
    }
    return false
}