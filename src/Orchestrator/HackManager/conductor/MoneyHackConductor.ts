/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Message, MessageHandler, Payload} from "/Orchestrator/MessageManager/class";
import {Action, ChannelName} from "/Orchestrator/MessageManager/enum";
import {DEBUG, HACKING_SCRIPTS, KILL_MESSAGE, MIN_HACK_CHANCE, TIMEOUT_THRESHOLD} from "/Orchestrator/Config/Config";
import {HackType} from "/Orchestrator/HackManager/enum";
import {ThreadsList} from "/Orchestrator/ThreadManager/manager";
import {Hack} from "/Orchestrator/HackManager/hack";
import {executeScript, formatMoney} from "/Orchestrator/Common/GenericFunctions";
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

    const hackAllocatedThreads = await getThreads(ns, hack.hackThreads, messageHandler, {time: hack.hackTime})

    let numOfHackHost = Object.keys(hackAllocatedThreads).length

    let hackResponseReceived = 0
    let hackValue = 0

    if (!numOfHackHost) {
        dprint(ns, "Hack lack required threads")
        hackAllocatedThreads && await freeThreads(ns, hackAllocatedThreads, messageHandler)
        return messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady, -1))
    }

    dprint(ns, 'Hack ready')
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady))

    dprint(ns, "Starting hack script")
    numOfHackHost = await executeScript(ns, HACKING_SCRIPTS.hack, hackAllocatedThreads, hack, messageHandler, myId)
    const hackStartTime: number = Date.now()
    const timeOutTime: number = hackStartTime + hack.weakenTime + TIMEOUT_THRESHOLD
    const timeOutHour: number = new Date(timeOutTime).getHours()
    const timeOutMinute: number = new Date(timeOutTime).getMinutes()
    const timeOutSecond: number = new Date(timeOutTime).getSeconds()

    dprint(ns, "Awaiting hack confirmation")
    dprint(ns, "Hack will timeout at: " + timeOutHour + ":" + timeOutMinute + ":" + timeOutSecond)


    while (timeOutTime>Date.now()) {
        //if(await checkForKill()) return
        const responses: Message[] = await messageHandler.getMessagesInQueue()
        for (const response of responses) {
            if (response.payload.action === Action.hackScriptDone) {
                hackResponseReceived++
                hackValue += response.payload.info as number
                dprint(ns, "Received " + hackResponseReceived + "/" + numOfHackHost + " hack results")
            }
        }
        if (hackResponseReceived >= numOfHackHost) {
            break
        }

        await ns.sleep(100)
    }

    dprint(ns, "Hack script completed")
    await freeThreads(ns, hackAllocatedThreads, messageHandler)

    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, formatMoney(hackValue)))
    await messageHandler.clearMyMessage()

    dprint(ns, "Exiting")
}



