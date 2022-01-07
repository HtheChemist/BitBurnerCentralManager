/** @param {NS} ns **/
import { MessageHandler, Payload } from "/Orchestrator/Class/Message";
import { Action, ChannelName } from "/Orchestrator/Enum/MessageEnum";
export async function main(ns) {
    ns.disableLog("sleep");
    const mySelf = ChannelName.hackScript;
    const target = ns.args[0];
    const originId = ns.args[1];
    const messageHandler = new MessageHandler(ns, mySelf);
    const results = await ns.grow(target);
    await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.growScriptDone, results), originId);
}
