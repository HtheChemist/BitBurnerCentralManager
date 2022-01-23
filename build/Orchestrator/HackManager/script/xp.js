/** @param {NS} ns **/
import { MessageHandler, Payload } from "/Orchestrator/MessageManager/class";
import { Action, ChannelName } from "/Orchestrator/MessageManager/enum";
import { dprint } from "/Orchestrator/Common/Dprint";
export async function main(ns) {
    ns.disableLog("sleep");
    const mySelf = ChannelName.hackScript;
    const target = ns.args[0];
    const originId = ns.args[1];
    const myId = ns.args[2];
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
        const results = await ns.weaken(target);
        dprint(ns, "Weaken: " + results);
        await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.weakenScriptDone, results), originId);
        cycle++;
    }
}
