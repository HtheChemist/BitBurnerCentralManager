/** @param {NS} ns **/

import {NS} from "Bitburner";
import {
  Message,
  MessageActions,
  MessageHandler,
  Payload,
} from "/Orchestrator/Class/Message";
import {
  DEBUG,
  HACKING_SCRIPTS,
  HACKING_SERVER, MANAGING_SERVER,
} from "/Orchestrator/Config/Config";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";

export class Thread {
  host: string;
  inUse: boolean;

  constructor(host: string, inUse: boolean) {
    this.host = host;
    this.inUse = inUse;
  }
}

export type ThreadsList = Record<string, number>

export async function main(ns) {
  ns.disableLog('sleep')
  ns.disableLog('getScriptRam')
  ns.disableLog('getServerMaxRam')
  ns.disableLog('getServerUsedRam')

  const mySelf: ChannelName = ChannelName.threadManager
  let threads: Thread[] = []
  const messageActions: MessageActions = {
    [Action.getThreads]: getThreads,
    [Action.getThreadsAvailable]: getAvailableThreads,
    [Action.addHost]: addHost,
    [Action.freeThreads]: freeThreads,
    [Action.updateHost]: updateHost
  }
  const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)

  const ramChunk = Math.max(...Object.values(HACKING_SCRIPTS).map(script => ns.getScriptRam(script)))

  while (true) {
    const lastMessage: Message[] = messageHandler.popLastMessage()
    lastMessage.length > 0 && await messageActions[lastMessage[0].payload.action]?.(lastMessage[0])
    await ns.sleep(100)
  }

  async function addHost(message: Message) {
    let host: string = message.payload.info as string
    // If the host is the one from which the Hack emanate we skip it
    if (host === HACKING_SERVER || host === MANAGING_SERVER) return
    const hostThreads: number = Math.floor((ns.getServerMaxRam(host)-ns.getServerUsedRam(host)) / ramChunk)
    DEBUG && ns.print("Got new host: " + host + " with " + hostThreads + " threads")
    for (let j = 0; j < hostThreads; j++) {
      threads.push(new Thread(host, false))
    }
  }

  async function getAvailableThreads(message) {
    DEBUG && ns.print("Got thread request from: " + message.origin + " for available threads")
    let availableThreads = threads.filter(thread => !thread.inUse).length
    let payload = new Payload(Action.threadsAvailable, availableThreads)
    await messageHandler.sendMessage(message.origin, payload, message.originId)
  }

  async function getThreads(message: Message) {
    let number: number | string = message.payload.info as number
    const exact: boolean = message.payload.extra !== false
    const unusedThreads: Thread[] = threads.filter(thread => !thread.inUse)

    DEBUG && ns.print("Got thread request from: " + message.originId + " for " + number + " threads (Exact: " + exact + ")")
    // -1 will return all available threads
    if (number === -1) {
      number = unusedThreads.length as number
    }

    if (unusedThreads.length < number && exact) {
      DEBUG && ns.print("Not enough threads")
      await messageHandler.sendMessage(message.origin, new Payload(Action.threads, {}), message.originId)
      return
    }

    const allocatedThreads: Thread[] = unusedThreads.slice(0, number)
    allocatedThreads.map(thread => thread.inUse = true)

    const uniqueHost: string[] = [...new Set(allocatedThreads.map(thread => thread.host))];
    const allocatedThreadsByHost: ThreadsList = uniqueHost.reduce((acc, cur) => (acc[cur] = allocatedThreads.filter(t => t.host == cur).length, acc), {})
    DEBUG && ns.print("Allocated " + allocatedThreads.length + " threads to hack " + message.originId)
    await messageHandler.sendMessage(message.origin, new Payload(Action.threads, allocatedThreadsByHost), message.originId)
  }

  async function freeThreads(message) {
    DEBUG && ns.print("Received thread freeing request from " + message.origin + "(Origin ID: " + message.originId + ")")
    const threadsInfo: ThreadsList = message.payload.info
    for (let i = 0; i < Object.keys(threadsInfo).length; i++) {
      const host: string = Object.keys(threadsInfo)[i]
      const usedThreads: Thread[] = threads.filter(thread => thread.inUse && thread.host === host).slice(0, threadsInfo[host])
      usedThreads.map(thread => thread.inUse = false)
      DEBUG && ns.print("Deallocated " + threadsInfo[host] + " threads of " + host)
    }
  }

  async function updateHost(message) {
    DEBUG && ns.print("Updating threads amount on " + message.payload.info)
    const host: string = message.payload.info
    threads = threads.filter(t => t.host !== host)
    await addHost(message)
  }
}







