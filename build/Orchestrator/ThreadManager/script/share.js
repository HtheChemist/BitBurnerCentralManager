/** @param {NS} ns **/
import { MessageHandler } from "/Orchestrator/MessageManager/class";
import { Action, ChannelName } from "/Orchestrator/MessageManager/enum";
import { dprint } from "/Orchestrator/Common/Dprint";
export async function main(ns) {
    ns.disableLog("sleep");
    const mySelf = ChannelName.shareScript;
    const myId = ns.args[0];
    const messageHandler = new MessageHandler(ns, mySelf, myId);
    let stopRequest = false;
    let cycle = 0;
    dprint(ns, "Starting");
    while (!stopRequest) {
        dprint(ns, "New cycle: " + cycle);
        const responses = await messageHandler.getMessagesInQueue();
        if (responses.length > 0) {
            for (const response of responses) {
                if (response.payload.action === Action.stop) {
                    stopRequest = true;
                }
            }
        }
        await ns.share();
        dprint(ns, "Cycle " + cycle + " done.");
        cycle++;
    }
    dprint(ns, "Stop requested.");
}
