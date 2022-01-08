/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Message, MessageHandler, Payload} from "/Orchestrator/Class/Message";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {DEBUG, HACKING_SCRIPTS} from "/Orchestrator/Config/Config";
import {HackType} from "/Orchestrator/Enum/HackEnum";
import {ThreadsList} from "/Orchestrator/Manager/ThreadManager";
import {Hack} from "/Orchestrator/Class/Hack";

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
        const weakenAllocatedThreads: ThreadsList = await getThreads(hack.weakenThreads)
        const numOfWeakenHost = Object.keys(weakenAllocatedThreads).length

        let weakenResponseReceived = 0

        DEBUG && ns.print("Starting weaken script. Cycle number: " + cycle)

        executeScript(HACKING_SCRIPTS.weaken, weakenAllocatedThreads)
        DEBUG && ns.print("Awaiting weaken confirmation")

        while (true) {
            const response = messageHandler.getMessagesInQueue(m => m.payload.action === Action.weakenScriptDone)
            if (response.length>0) {
                weakenResponseReceived += response.length
                DEBUG && ns.print("Received " + weakenResponseReceived + "/" + numOfWeakenHost + " weaken results")
            }
            if (weakenResponseReceived >= numOfWeakenHost) {
                DEBUG && ns.print("Weaken complete, restarting a cycle.")
                break
            }
        }

        cycle++
        await freeThreads(weakenAllocatedThreads)
        const stopMessage = messageHandler.getMessagesInQueue(m => m.payload.action === Action.stop)
        if (stopMessage.length > 0) {
            DEBUG && ns.print("Stop request received")
            break
        }
    }

    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, "Stop request"))

    DEBUG && ns.print("Exiting")

    async function getThreads(amount: number): Promise<ThreadsList> {
        DEBUG && ns.print("Getting threads")
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.getThreads, amount, hack.hackType !== HackType.quickMoneyHack))
        DEBUG && ns.print("Awaiting answer")
        const response: Message[] = await messageHandler.waitForAnswer()
        DEBUG && ns.print("Got answer")
        DEBUG && ns.print(response[0].payload.info)
        return response[0].payload.info as ThreadsList
    }

    function executeScript(script: string, threads: ThreadsList) {
        DEBUG && ns.print("Executing scripts")
        for (let i = 0; i < Object.keys(threads).length; i++) {
            const keyName = Object.keys(threads)[i]
            ns.exec(script, keyName, threads[keyName], hack.host, myId)
        }
    }

    async function freeThreads(allocatedThreads: ThreadsList) {
        DEBUG && ns.print("Freeing threads")
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.freeThreads, allocatedThreads))
    }
}