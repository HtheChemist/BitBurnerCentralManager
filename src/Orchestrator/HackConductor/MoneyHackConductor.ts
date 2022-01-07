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


  const growAllocatedThreads: ThreadsList = hack.hackType === HackType.fullMoneyHack && await getThreads(hack.growThreads) || {}
  const weakenAllocatedThreads: ThreadsList = hack.hackType === HackType.fullMoneyHack && await getThreads(hack.weakenThreads) || {}
  const hackAllocatedThreads = await getThreads(hack.hackThreads)

  const numOfGrowHost = Object.keys(growAllocatedThreads).length
  const numOfWeakenHost = Object.keys(weakenAllocatedThreads).length
  const numOfHackHost = Object.keys(hackAllocatedThreads).length

  let growResponseReceived = 0
  let weakenResponseReceived = 0
  let hackResponseReceived = 0
  let hackValue = 0

  if (!(hack.hackType === HackType.fullMoneyHack && (!numOfGrowHost || !numOfWeakenHost)) && !numOfHackHost) {
    DEBUG && ns.print("Hack lack required threads")
    return messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady, -1))
  }

  DEBUG && ns.print('Hack ready')
  await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady))

  if (hack.hackType === HackType.fullMoneyHack) {
    DEBUG && ns.print("Starting weaken script")
    DEBUG && ns.print("Starting grow script")

    executeScript(HACKING_SCRIPTS.weaken, weakenAllocatedThreads)
    executeScript(HACKING_SCRIPTS.grow, growAllocatedThreads)
    DEBUG && ns.print("Awaiting grow/weaken confirmation")
    while (true) {
      const response = await messageHandler.waitForAnswer()

      if (response[0].payload.action === Action.growScriptDone) {
        growResponseReceived++
        DEBUG && ns.print("Received " + growResponseReceived + "/" + numOfGrowHost + " grow results")
      } else if (response[0].payload.action === Action.weakenScriptDone) {
        weakenResponseReceived++
        DEBUG && ns.print("Received " + weakenResponseReceived + "/" + numOfWeakenHost + " weaken results")
      }
      if (weakenResponseReceived >= numOfWeakenHost && growResponseReceived >= numOfGrowHost) {
        DEBUG && ns.print("Weaken and grow completed.")
        await freeThreads(growAllocatedThreads)
        await freeThreads(weakenAllocatedThreads)
        break
      }
    }
  }

  DEBUG && ns.print("Starting hack script")
  executeScript(HACKING_SCRIPTS.hack, hackAllocatedThreads)
  DEBUG && ns.print("Awaiting hack confirmation")

  while (true) {
    const response = await messageHandler.waitForAnswer()
    hackResponseReceived++
    hackValue += response[0].payload.info as number
    DEBUG && ns.print("Received " + hackResponseReceived + "/" + numOfHackHost + " hack results")
    if (hackResponseReceived >= numOfHackHost) {
      DEBUG && ns.print("Hack script completed")
      await freeThreads(hackAllocatedThreads)
      break
    }
  }

  await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, hackValue))

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



