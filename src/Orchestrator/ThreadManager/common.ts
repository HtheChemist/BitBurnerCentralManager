import {NS} from "Bitburner";
import {ThreadsList} from "/Orchestrator/ThreadManager/manager";
import {Message, MessageHandler, Payload, PayloadData} from "/Orchestrator/MessageManager/class";
import {DEBUG} from "/Orchestrator/Config/Config";
import {Action, ChannelName} from "/Orchestrator/MessageManager/enum";
import {Hack} from "/Orchestrator/HackManager/hack";
import {dprint} from "/Orchestrator/Common/Dprint";

export async function getThreads(ns: NS, amount: number, messageHandler: MessageHandler, extra: PayloadData): Promise<ThreadsList> {
    const response: Message[] = await messageHandler.sendAndWait(ChannelName.threadManager, new Payload(Action.getThreads, amount, extra), null, true, m => m.payload.action === Action.threads)
    if (response.length === 0) {
        ns.tprint("Did not receive any thread answers!")
        return {}
    }
    DEBUG && ns.print("Got threads: ")
    DEBUG && ns.print(response[0].payload.info as string)
    return response[0].payload.info as ThreadsList
}

export async function freeThreads(ns: NS, allocatedThreads: ThreadsList, messageHandler: MessageHandler) {
    DEBUG && ns.print("Freeing threads")
    await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.freeThreads, allocatedThreads))
}