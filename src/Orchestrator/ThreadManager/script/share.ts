/** @param {NS} ns **/
import {MessageHandler, Payload} from "/Orchestrator/MessageManager/class";
import {NS} from "Bitburner";
import {Action, ChannelName} from "/Orchestrator/MessageManager/enum";
import {dprint} from "/Orchestrator/Common/Dprint";

export async function main(ns: NS) {
    ns.disableLog("sleep");

    const mySelf: ChannelName = ChannelName.shareScript;

    const myId: number = ns.args[0] as number;

    const messageHandler: MessageHandler = new MessageHandler(ns, mySelf, myId);
    let stopRequest: boolean = false
    let cycle = 0
    dprint(ns, "Starting")

    while (!stopRequest) {
        dprint(ns, "New cycle: " + cycle)
        const responses = await messageHandler.getMessagesInQueue()
        if (responses.length > 0) {
            for (const response of responses) {
                if (response.payload.action === Action.stop) {
                    stopRequest = true
                }
            }
        }

        await ns.share();
        dprint(ns, "Cycle " + cycle + " done.")
        cycle++
    }
    dprint(ns, "Stop requested.")
}