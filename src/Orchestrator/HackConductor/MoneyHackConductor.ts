/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Message, MessageHandler, Payload} from "/Orchestrator/Class/Message";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {DEBUG, HACKING_SCRIPTS, KILL_MESSAGE, MIN_HACK_CHANCE} from "/Orchestrator/Config/Config";
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

    const hackAllocatedThreads = await getThreads(ns, hack.hackThreads, messageHandler, hack)

    let numOfHackHost = Object.keys(hackAllocatedThreads).length

    let hackResponseReceived = 0
    let hackValue = 0

    if (!numOfHackHost) {
        DEBUG && ns.print("Hack lack required threads")
        hackAllocatedThreads && await freeThreads(ns, hackAllocatedThreads, messageHandler)
        return messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady, -1))
    }

    DEBUG && ns.print('Hack ready')
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady))

    DEBUG && ns.print("Starting hack script")
    numOfHackHost = await executeScript(ns, HACKING_SCRIPTS.hack, hackAllocatedThreads, hack, messageHandler, myId)
    DEBUG && ns.print("Awaiting hack confirmation")

    while (true) {
        //if(await checkForKill()) return
        const response = await messageHandler.getMessagesInQueue()
        for (let k = 0; k < response.length; k++) {
            if (response[k].payload.action === Action.hackScriptDone) {
                hackResponseReceived++
                hackValue += response[k].payload.info as number
                DEBUG && ns.print("Received " + hackResponseReceived + "/" + numOfHackHost + " hack results")
            }
        }
        if (hackResponseReceived >= numOfHackHost) {
            DEBUG && ns.print("Hack script completed")
            await freeThreads(ns, hackAllocatedThreads, messageHandler)
            break
        }

        await ns.sleep(100)
    }

    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, hackValue))

    DEBUG && ns.print("Exiting")
}



