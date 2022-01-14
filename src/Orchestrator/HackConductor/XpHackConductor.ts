/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Message, MessageHandler, Payload} from "/Orchestrator/Class/Message";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {DEBUG, HACKING_SCRIPTS} from "/Orchestrator/Config/Config";
import {HackType} from "/Orchestrator/Enum/HackEnum";
import {ThreadsList} from "/Orchestrator/Manager/ThreadManager";
import {Hack} from "/Orchestrator/Class/Hack";
import {executeScript, freeThreads, getThreads} from "/Orchestrator/Common/GenericFunctions";

export async function main(ns) {
    ns.disableLog('sleep')
    ns.disableLog('exec')


    const myId = ns.args[1]
    const mySelf: ChannelName = ChannelName.hackConductor
    const messageHandler: MessageHandler = new MessageHandler(ns, mySelf, myId)

    const hack: Hack = Hack.fromJSON(ns.args[0])
    DEBUG && ns.print("Starting hack: " + myId)
    let cycle = 0
    DEBUG && ns.print('Hack ready')
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady))

    while (true) {
        const weakenAllocatedThreads: ThreadsList = await getThreads(ns, hack.weakenThreads, messageHandler, hack)

        let weakenResponseReceived = 0
        let stopRequest = false

        DEBUG && ns.print("Starting weaken script. Cycle number: " + cycle)

        const numOfWeakenHost = await executeScript(ns, HACKING_SCRIPTS.weaken, weakenAllocatedThreads, hack, messageHandler, myId)
        DEBUG && ns.print("Awaiting weaken confirmation")

        while (true) {
            const response = await messageHandler.getMessagesInQueue()
            if (response.length > 0) {
                for (let i = 0; i < response.length; i++) {
                    switch (response[i].payload.action) {
                        case Action.weakenScriptDone:
                            weakenResponseReceived++
                            DEBUG && ns.print("Received " + weakenResponseReceived + "/" + numOfWeakenHost + " weaken results")
                            break;
                        case Action.stop:
                            stopRequest = true
                            break;
                    }
                }
            }
            if (weakenResponseReceived >= numOfWeakenHost) {
                DEBUG && ns.print("Weaken complete, restarting a cycle.")
                break
            }
        }

        cycle++
        await freeThreads(ns, weakenAllocatedThreads, messageHandler)

        if (stopRequest) {
            break
        }
    }

    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, "Stop request"))

    DEBUG && ns.print("Exiting")
}