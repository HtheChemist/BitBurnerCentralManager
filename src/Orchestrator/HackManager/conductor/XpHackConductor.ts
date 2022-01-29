/** @param {NS} ns **/
import {NS} from "Bitburner";
import {MessageHandler, Payload} from "/Orchestrator/MessageManager/class";
import {Action, ChannelName} from "/Orchestrator/MessageManager/enum";
import {HACKING_SCRIPTS, TIMEOUT_THRESHOLD} from "/Orchestrator/Config/Config";
import {ThreadsList} from "/Orchestrator/ThreadManager/manager";
import {Hack} from "/Orchestrator/HackManager/hack";
import {executeScript} from "/Orchestrator/Common/GenericFunctions";
import {freeThreads, getThreads} from "/Orchestrator/ThreadManager/common";
import {dprint} from "/Orchestrator/Common/Dprint";

export async function main(ns) {
    ns.disableLog('sleep')
    ns.disableLog('exec')


    const myId = ns.args[1]
    const mySelf: ChannelName = ChannelName.hackConductor
    const messageHandler: MessageHandler = new MessageHandler(ns, mySelf, myId)

    const hack: Hack = Hack.fromJSON(ns.args[0])
    dprint(ns, "Starting hack: " + myId)
    let cycle = 0
    dprint(ns, 'Hack ready')
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady))
    const weakenAllocatedThreads: ThreadsList = await getThreads(ns, hack.weakenThreads, messageHandler, {time: hack.weakenTime})
    const numOfWeakenHost = await executeScript(ns, HACKING_SCRIPTS.xp, weakenAllocatedThreads, hack, messageHandler, myId)
    let stopRequest = false

    dprint(ns, "Starting XP script")

    while (!stopRequest) {

        let weakenResponseReceived = 0

        const responses = await messageHandler.getMessagesInQueue()
        for (const response of responses) {
            switch (response.payload.action) {
                case Action.weakenScriptDone:
                    weakenResponseReceived++
                    dprint(ns, "Received " + weakenResponseReceived + "/" + numOfWeakenHost + " weaken results")
                    if (weakenResponseReceived >= numOfWeakenHost) {
                        cycle++
                        weakenResponseReceived = 0
                        dprint(ns, "Weaken cycle complete. Starting cycle: " + cycle)
                    }
                    break;
                case Action.stop:
                    dprint(ns, "Received stop request")
                    stopRequest = true
                    break;
                default:
                    break;
            }
        }
        await ns.sleep(100)
    }

    dprint(ns, "Stop requested")
    for (let i = 0; i < numOfWeakenHost; i++) {
        await messageHandler.sendMessage(ChannelName.bootScript, new Payload(Action.stop), (myId * 1000) + i)
    }

    await freeThreads(ns, weakenAllocatedThreads, messageHandler)
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, "Stop request"))
    await messageHandler.clearMyMessage()

    dprint(ns, "Exiting")
}