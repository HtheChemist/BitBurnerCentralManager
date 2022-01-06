/** @param {NS} ns **/
import {MessageHandler, Payload} from '../Class/Message.js'
import {NS} from "Bitburner";
import {Action, ChannelName} from "../Enum/MessageEnum";

export async function main(ns: NS) {
    ns.disableLog('sleep')

    const mySelf: ChannelName = ChannelName.hackScript

    const target: string = ns.args[0] as string
    const originId: number = ns.args[1] as number

    const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)
    const results: number = await ns.weaken(target)

    await messageHandler.sendMessage(ChannelName.hackClass, new Payload(Action.weakenScriptDone, results), originId)
}