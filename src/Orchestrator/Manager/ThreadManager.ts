/** @param {NS} ns **/

import {NS} from "Bitburner";
import {Message, MessageActions, MessageHandler, Payload,} from "/Orchestrator/Class/Message";
import {DEBUG, HACKING_SCRIPTS, HACKING_SERVER, MANAGING_SERVER,} from "/Orchestrator/Config/Config";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";

export class Thread {
    host: string;
    inUse: boolean;
    locked: boolean;

    constructor(host: string, inUse: boolean) {
        this.host = host;
        this.inUse = inUse;
        this.locked = false;
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
    let killrequest: boolean = false
    const messageActions: MessageActions = {
        [Action.getThreads]: getThreads,
        [Action.getThreadsAvailable]: getAvailableThreads,
        [Action.addHost]: addHost,
        [Action.freeThreads]: freeThreads,
        [Action.updateHost]: updateHost,
        [Action.kill]: kill,
        [Action.consoleThreadsUse]: consoleThreadsUse,
        [Action.lockHost]: lockHost,
        [Action.getTotalThreads]: getTotalThreads
    }
    const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)

    const ramChunk = Math.max(...Object.values(HACKING_SCRIPTS).map(script => ns.getScriptRam(script)))

    while (true) {
        if (killrequest) break
        const lastMessage: Message[] = await messageHandler.popLastMessage()
        lastMessage.length > 0 && await messageActions[lastMessage[0].payload.action]?.(lastMessage[0])
        await ns.sleep(100)
    }

    DEBUG && ns.tprint("Exiting")

    async function addHost(message: Message) {
        const host: string = message.payload.info as string
        const hosts: string[] = [...new Set(threads.map(thread => thread.host))];
        // If the host is the one from which the Hack emanate we skip it
        if (host === HACKING_SERVER || host === MANAGING_SERVER) return
        if (hosts.includes(host)) await updateHost(message)
        const hostThreads: number = Math.floor(((ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ramChunk))
        DEBUG && ns.print("Got new host: " + host + " with " + hostThreads + " threads")
        for (let j = 0; j < hostThreads; j++) threads.push(new Thread(host, false))
    }

    async function getTotalThreads(message: Message) {
        const payload: Payload = new Payload(Action.totalThreads, threads.filter(t => !t.locked).length)
        await messageHandler.sendMessage(message.origin, payload, message.originId)
    }

    async function getAvailableThreads(message: Message) {
        //DEBUG && ns.print("Got thread request from: " + message.origin + " for available threads")
        let payload = new Payload(Action.threadsAvailable, 0)
        if (threads.length) {
            let availableThreads = threads.filter(thread => (!thread.inUse && !thread.locked)).length
            payload = new Payload(Action.threadsAvailable, availableThreads)
        }
        await messageHandler.sendMessage(message.origin, payload, message.originId)
    }

    async function getThreads(message: Message) {
        let number: number | string = message.payload.info as number
        const exact: boolean = message.payload.extra !== false
        if (threads.length === 0) {
            DEBUG && ns.print("Thread manager not ready.")
            await messageHandler.sendMessage(message.origin, new Payload(Action.threads, {}), message.originId)
            return
        }
        const unusedThreads: Thread[] = threads.filter(thread => (!thread.inUse && !thread.locked))

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
        const allocatedThreadsByHost: ThreadsList = uniqueHost.reduce((acc, cur) => {
            acc[cur] = allocatedThreads.filter(t => t.host == cur).length
            return acc
        }, {})
        DEBUG && ns.print("Allocated " + allocatedThreads.length + " threads to hack " + message.originId)
        await messageHandler.sendMessage(message.origin, new Payload(Action.threads, allocatedThreadsByHost), message.originId)
    }

    async function freeThreads(message) {
        DEBUG && ns.print("Received thread freeing request from " + message.origin + "(Origin ID: " + message.originId + ")")
        const threadsInfo: ThreadsList = message.payload.info
        for (const host of Object.keys(threadsInfo)) {
            for (let i=0; i<threadsInfo[host]; i++) {
                const threadIndex = threads.findIndex(t => (t.inUse && t.host === host))
                if (threadIndex) threads[threadIndex].inUse = false
            }
            DEBUG && ns.print("Deallocated " + threadsInfo[host] + " threads of " + host)
            await checkLockedStatus(host)
        }
    }

    async function checkLockedStatus(hostname: string) {
        const hostThreads: Thread[] = threads.filter(t => (t.host === hostname))
        if (hostThreads.some(t => t.locked) && !hostThreads.some(t => t.inUse)) {
            await messageHandler.sendMessage(ChannelName.serverManager, new Payload(Action.hostLocked, hostname))
        }
    }

    async function updateHost(message) {
        DEBUG && ns.print("Updating threads amount on " + message.payload.info)
        const host: string = message.payload.info
        threads = threads.filter(t => t.host !== host)
        await addHost(message)
    }

    async function kill() {
        DEBUG && ns.print("Kill request. Kill all threads")
        const usedThreads: Thread[] = threads.filter(t => t.inUse = true)
        const uniqueHost: string[] = [...new Set(usedThreads.map(thread => thread.host))];
        for (const host of uniqueHost) {
            ns.killall(host)
        }
        killrequest = true
    }

    async function consoleThreadsUse(message: Message) {
        for (const host of [...new Set(threads.map(thread => thread.host))]) {
            const hostUsedRam: number = ns.getServerUsedRam(host)
            const hostMaxRam: number = ns.getServerMaxRam(host)
            const hostThreads: Thread[] = threads.filter(t => t.host === host)
            const hostThreadsInUse: Thread[] = hostThreads.filter(t => t.inUse)
            const numberOfBar: number = hostThreads.length ? Math.round((hostThreadsInUse.length / hostThreads.length * 20)) : 20
            const numberOfDash: number = 20 - numberOfBar
            const padding: number = 20 - host.length
            ns.tprint(host + " ".repeat(padding) + ": [" + "|".repeat(numberOfBar) + "-".repeat(numberOfDash) + "] (" + hostThreadsInUse.length + "/" + hostThreads.length + ")  " + hostUsedRam + " GiB/" + hostMaxRam + " GiB")
        }
    }

    async function lockHost(message: Message) {
        for (const thread of threads) if (thread.host === message.payload.info) thread.locked = true;
        await checkLockedStatus(message.payload.info as string)
    }
}







