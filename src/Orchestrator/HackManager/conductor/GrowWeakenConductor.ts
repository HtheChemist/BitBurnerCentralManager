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
import {DEBUG} from "/Orchestrator/Config/Debug";

export async function main(ns) {
    ns.disableLog('sleep')
    ns.disableLog('exec')

    const myId = ns.args[1]
    const mySelf: ChannelName = ChannelName.hackConductor
    const messageHandler: MessageHandler = new MessageHandler(ns, mySelf, myId)

    const hack: Hack = Hack.fromJSON(ns.args[0])
    dprint(ns, "Starting hack: " + myId)

    let allocatedThreads: ThreadsList = await getThreads(
        ns,
        hack.growThreads + hack.weakenThreads,
        messageHandler,
        {time: Math.max(hack.weakenTime, hack.growTime)}
    )

    let numOfHost = Object.keys(allocatedThreads).length

    if (!numOfHost) {
        dprint(ns, "Hack lack required threads")
        await freeThreads(ns, allocatedThreads, messageHandler)
        return messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady, -1))
    }

    let growAllocatedThreads: ThreadsList = {}
    let growThreadsAmountRequired = hack.growThreads
    for (const host of Object.keys(allocatedThreads)) {
        if (growThreadsAmountRequired === 0) {
            break
        } else if (allocatedThreads[host] <= growThreadsAmountRequired) {
            growAllocatedThreads[host] = allocatedThreads[host]
            growThreadsAmountRequired -= allocatedThreads[host]
            delete allocatedThreads[host]
        } else if (allocatedThreads[host] > growThreadsAmountRequired) {
            growAllocatedThreads[host] = growThreadsAmountRequired
            allocatedThreads[host] -= growThreadsAmountRequired
            growThreadsAmountRequired = 0
        }
    }

    let weakenAllocatedThreads = {...allocatedThreads}

    let growResponseReceived = 0
    let weakenResponseReceived = 0

    dprint(ns, 'Hack ready')
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady))

    dprint(ns, "Starting weaken script")
    dprint(ns, "Starting grow script")

    let numOfWeakenHost = await executeScript(ns, HACKING_SCRIPTS.weaken, weakenAllocatedThreads, hack, messageHandler, myId)
    let numOfGrowHost = await executeScript(ns, HACKING_SCRIPTS.grow, growAllocatedThreads, hack, messageHandler, myId)
    const hackStartTime: number =  Date.now()
    const timeOutTime: number = hackStartTime + hack.hackTime + TIMEOUT_THRESHOLD
    const timeOutHour: number = new Date(timeOutTime).getHours()
    const timeOutMinute: number = new Date(timeOutTime).getMinutes()
    const timeOutSecond: number = new Date(timeOutTime).getSeconds()

    dprint(ns, "Awaiting grow/weaken confirmation")
    dprint(ns, "Hack will timeout at: " + timeOutHour + ":" + timeOutMinute + ":" + timeOutSecond)

    while (timeOutTime>Date.now()) {
        //const filter = m => (m.payload.action === Action.weakenScriptDone || m.payload.action === Action.growScriptDone)
        //if(await checkForKill()) return
        const responses = await messageHandler.getMessagesInQueue()
        for (const response of responses) {
            switch (response.payload.action) {
                case Action.growScriptDone:
                    growResponseReceived++
                    dprint(ns, "Received " + growResponseReceived + "/" + numOfGrowHost + " grow results")
                    break;
                case Action.weakenScriptDone:
                    // Weaken takes longer than grow
                    weakenResponseReceived++
                    dprint(ns, "Received " + weakenResponseReceived + "/" + numOfWeakenHost + " weaken results")
                    break;
                default:
                    break;
            }
        }

        // if (Date.now()>hackStartTime+hack.weakenTime+TIMEOUT_THRESHOLD) {
        //     ns.tprint("HACK " + hack.host + " IS OVERTIME")
        //     ns.tprint("G: " + growResponseReceived + "/" + numOfGrowHost)
        //     ns.tprint("W: " + weakenResponseReceived + "/" + numOfWeakenHost)
        // }

        if ((weakenResponseReceived >= numOfWeakenHost && growResponseReceived >= numOfGrowHost)) {
            break
        }
        await ns.sleep(100)
    }

    dprint(ns, "Weaken and grow completed.")
    await freeThreads(ns, growAllocatedThreads, messageHandler)
    await freeThreads(ns, weakenAllocatedThreads, messageHandler)

    const results = "$: " + Math.round(ns.getServerMoneyAvailable(hack.host)/ns.getServerMaxMoney(hack.host)*100000)/1000 + "%, Sec: " + Math.round(((ns.getServerSecurityLevel(hack.host)/ns.getServerMinSecurityLevel(hack.host))-1)*100000)/1000
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, results))
    await messageHandler.clearMyMessage()
    dprint(ns, "Exiting")
}



