/** @param {NS} ns **/

import {NS} from "Bitburner";
import {Payload, MessageHandler, Message, MessageActions} from './Class/Message'
import {HACKING_SCRIPTS, HACKING_SERVER, DEBUG} from './Config'
import {Action, ChannelName} from "./Enum/MessageEnum";



export class Thread {
	host: string
	inUse: boolean

	constructor(host: string, inUse: boolean) {
		this.host = host
		this.inUse = inUse
	}
}

export type ThreadsList = Record<string, number>

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('getScriptRam')
	ns.disableLog('getServerMaxRam')

	const mySelf: ChannelName = ChannelName.threadManager
	const threads: Thread[] = []
	const messageActions: MessageActions = {
		[Action.getThreads]: getThreads,
		[Action.getThreadsAvailable]: getAvailableThreads,
		[Action.addHost]: addHost,
		[Action.freeThreads]: freeThreads
	}
	const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)

	const ramChunk = Math.max(...Object.values(HACKING_SCRIPTS).map(script => ns.getScriptRam(script)))

	while(true) {
		messageHandler.checkMessage()
		const lastMessage: Message|boolean = messageHandler.popLastMessage()
		lastMessage instanceof Message && messageActions[lastMessage.payload.action]?.(lastMessage)
		await ns.sleep(100)
	}

	async function addHost(message: Message) {
		let host: string = message.payload.info as string
		// If the host is the one from which the Hack emanate we skip it
		if (host===HACKING_SERVER) return
		const hostThreads: number = Math.floor(ns.getServerMaxRam(host)/ramChunk)
		DEBUG && ns.print("Got new host: " + host + " with " + hostThreads + " threads")
		for(let j=0;j<hostThreads;j++) {
			threads.push(new Thread(host, false))
		}
	}

	async function getAvailableThreads(message) {
		let availableThreads = threads.filter(thread => !thread.inUse).length
		let payload = new Payload("availableThreads", availableThreads, message.originId)
		await messageHandler.sendMessage(message.origin, payload)
	}

	async function getThreads(message: Message) {
		let number: number|string = message.payload.info as number
		const exact: boolean = message.payload.extra as boolean || true
		const unusedThreads: Thread[] = threads.filter(thread => !thread.inUse)
		if(number===-1) {
			number = unusedThreads.length as number
		}

		if(unusedThreads.length<number && exact) {
			await messageHandler.sendMessage(message.origin, new Payload(Action.threads, -1))
		}

		const allocatedThreads: Thread[] = unusedThreads.slice(0, number)
		allocatedThreads.map(thread => thread.inUse = true)

		const uniqueHost: string[] = [...new Set(allocatedThreads.map(thread => thread.host))];
		const allocatedThreadsByHost: ThreadsList = uniqueHost.reduce((acc,cur) => (acc[cur] = allocatedThreads.filter(t => t.host==cur).length, acc), {})
		DEBUG && ns.print("Allocated " + allocatedThreads.length + " threads to hack " + message.originId)
		await messageHandler.sendMessage(message.origin, new Payload("threads", allocatedThreadsByHost), message.originId)
	}

	async function freeThreads(message) {
		DEBUG && ns.print("Received thread freeing request from " + message.origin + "(Origin ID: " + message.originId + ")")
		const threadsInfo: ThreadsList = message.payload.info
		for(let i=0;i<Object.keys(threadsInfo).length;i++) {
			const host: string = Object.keys(threadsInfo)[i]
			const usedThreads: Thread[] = threads.filter(thread => thread.inUse && thread.host === host).slice(0, threadsInfo[host])
			usedThreads.map(thread => thread.inUse = false)
			DEBUG && ns.print("Deallocated " + threadsInfo[host] + " threads of " + host)
		}
	}
}







