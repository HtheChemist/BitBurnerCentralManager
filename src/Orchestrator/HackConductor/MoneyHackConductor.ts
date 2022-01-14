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

    const quickHackType = (hack.hackType !== HackType.fullMoneyHack && hack.hackChance < MIN_HACK_CHANCE && hack.weakenThreads !== 0) ? 'weaken':'hack'

    const growAllocatedThreads: ThreadsList = hack.hackType === HackType.fullMoneyHack ? await getThreads(ns, hack.growThreads, messageHandler, hack) : {}
    const weakenAllocatedThreads: ThreadsList = hack.hackType === HackType.fullMoneyHack ? await getThreads(ns, hack.weakenThreads, messageHandler, hack) : {}

    const hackAllocatedThreads = quickHackType === "hack" ? await getThreads(ns, hack.hackThreads, messageHandler, hack) : await getThreads(ns, hack.weakenThreads, messageHandler, hack)

    let numOfGrowHost = Object.keys(growAllocatedThreads).length
    let numOfWeakenHost = Object.keys(weakenAllocatedThreads).length
    let numOfHackHost = Object.keys(hackAllocatedThreads).length

    let growResponseReceived = 0
    let weakenResponseReceived = 0
    let hackResponseReceived = 0
    let hackValue = 0

    const fullHackGotThreads: boolean = !!numOfGrowHost && !!numOfWeakenHost
    const hackGotThreads: boolean = !!numOfHackHost
    const gotThreads: boolean = hack.hackType === HackType.fullMoneyHack ? fullHackGotThreads && hackGotThreads : hackGotThreads

    if (!gotThreads) {
        DEBUG && ns.print("Hack lack required threads")
        hackAllocatedThreads && await freeThreads(ns, hackAllocatedThreads, messageHandler)
        weakenAllocatedThreads && await freeThreads(ns, weakenAllocatedThreads, messageHandler)
        growAllocatedThreads && await freeThreads(ns, growAllocatedThreads, messageHandler)
        return messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady, -1))
    }

    DEBUG && ns.print('Hack ready')
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady))

    if (hack.hackType === HackType.fullMoneyHack) {
        DEBUG && ns.print("Starting weaken script")
        DEBUG && ns.print("Starting grow script")

        numOfWeakenHost = await executeScript(ns, HACKING_SCRIPTS.weaken, weakenAllocatedThreads, hack, messageHandler, myId)
        numOfGrowHost = await executeScript(ns, HACKING_SCRIPTS.grow, growAllocatedThreads, hack, messageHandler, myId)
        DEBUG && ns.print("Awaiting grow/weaken confirmation")
        while (true) {
            //const filter = m => (m.payload.action === Action.weakenScriptDone || m.payload.action === Action.growScriptDone)
            //if(await checkForKill()) return
            const response = await messageHandler.getMessagesInQueue()
            for (let k = 0; k < response.length; k++) {
                if (response[k].payload.action === Action.growScriptDone) {
                    growResponseReceived++
                    DEBUG && ns.print("Received " + growResponseReceived + "/" + numOfGrowHost + " grow results")
                } else if (response[k].payload.action === Action.weakenScriptDone) {
                    weakenResponseReceived++
                    DEBUG && ns.print("Received " + weakenResponseReceived + "/" + numOfWeakenHost + " weaken results")
                }
            }
            if (weakenResponseReceived >= numOfWeakenHost && growResponseReceived >= numOfGrowHost) {
                DEBUG && ns.print("Weaken and grow completed.")
                await freeThreads(ns, growAllocatedThreads, messageHandler)
                await freeThreads(ns, weakenAllocatedThreads, messageHandler)
                break
            }
            await ns.sleep(100)
        }
    }

    DEBUG && ns.print("Starting " + quickHackType + " script")
    numOfHackHost = await executeScript(ns, HACKING_SCRIPTS[quickHackType], hackAllocatedThreads, hack, messageHandler, myId)
    DEBUG && ns.print("Awaiting " + quickHackType + " confirmation")
    const expectedResponse: Action = quickHackType === "weaken" ? Action.weakenScriptDone : Action.hackScriptDone

    while (true) {
        //if(await checkForKill()) return
        const response = await messageHandler.getMessagesInQueue()
        for (let k = 0; k < response.length; k++) {
            if (response[k].payload.action === expectedResponse) {
                hackResponseReceived++
                hackValue += response[k].payload.info as number
                DEBUG && ns.print("Received " + hackResponseReceived + "/" + numOfHackHost + " " + quickHackType + " results")
            }
        }
        if (hackResponseReceived >= numOfHackHost) {
            DEBUG && ns.print(quickHackType + " script completed")
            await freeThreads(ns, hackAllocatedThreads, messageHandler)
            break
        }

        await ns.sleep(100)
    }

    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, hackValue))

    DEBUG && ns.print("Exiting")
}



