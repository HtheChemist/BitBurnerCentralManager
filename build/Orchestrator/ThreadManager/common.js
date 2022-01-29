import { Payload } from "/Orchestrator/MessageManager/class";
import { Action, ChannelName } from "/Orchestrator/MessageManager/enum";
import { DEBUG } from "/Orchestrator/Config/Debug";
export async function getThreads(ns, amount, messageHandler, extra) {
    const response = await messageHandler.sendAndWait(ChannelName.threadManager, new Payload(Action.getThreads, amount, extra), null, true, m => m.payload.action === Action.threads);
    if (response.length === 0) {
        ns.tprint("Did not receive any thread answers!");
        return {};
    }
    DEBUG && ns.print("Got threads: ");
    DEBUG && ns.print(response[0].payload.info);
    return response[0].payload.info;
}
export async function freeThreads(ns, allocatedThreads, messageHandler) {
    DEBUG && ns.print("Freeing threads");
    await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.freeThreads, allocatedThreads));
}
