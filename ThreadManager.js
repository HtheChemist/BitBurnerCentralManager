/** @param {NS} ns **/

// The threadManager listen for thread request on port 1, answer request on port 2 and
// listen for threads deallocation on port 3, and new host on port 6


import {Payload, MessageHandler} from 'Message.js'
import {hackingScripts, hackOriginServer} from 'Constants.js'

let mySelf = "threadManager"

let threads

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('getScriptRam')
	ns.disableLog('getServerMaxRam')

	const messageActions = {
		getThreads: getThreads,
		getAvailableThreads: getAvailableThreads,
		addHost: addHost,
		freeThreads: freeThreads
	}

	const messageHandler = new MessageHandler(ns, mySelf)

	threads = []
	while(true) {
		messageHandler.checkMessage()
		let lastMessage = true
		while(lastMessage) {
			lastMessage = messageHandler.popLastMessage()
			if(lastMessage) {
				await messageActions[lastMessage.payload.action](ns, lastMessage, messageHandler)
			}
		}
		await ns.sleep(100)
	}
}

async function addHost(ns, message, messageHandler) {
	let host = message.payload.info
	// If the host is the one from which the Hack emanate we skip it
	if(host==hackOriginServer) {
		return
	}
	let ramChunk = Math.max(...Object.values(hackingScripts).map(script => ns.getScriptRam(script)))
	let hostThreads = Math.floor(ns.getServerMaxRam(host)/ramChunk)

	ns.print("Got new host: " + host + " with " + hostThreads + " threads")
	for(let j=0;j<hostThreads;j++) {
		threads.push({
			host: host,
			inUse: false
		})
	}
}

async function getAvailableThreads(ns, message, messageHandler) {
	let availableThreads = threads.filter(thread => thread.inUse == false).length
	let payload = new Payload("availableThreads", availableThreads, message.originId)
	await messageHandler.sendMessage(message.origin, payload)
}

async function getThreads(ns, message, messageHandler) {
	let number = message.payload.info
	let exact = message.payload.exact || true
	let unusedThreads = threads.filter(thread => thread.inUse == false)
	if(number=='max') {
		number = unusedThreads.length
	}

	if(unusedThreads.length<number && exact) {
		return false
	}

	let allocatedThreads = unusedThreads.slice(0, number)
	allocatedThreads.map(thread => thread.inUse = true)
	let uniqueHost = [...new Set(allocatedThreads.map(thread => thread.host))];
	let allocatedThreadsByHost = uniqueHost.reduce((acc,cur) => (acc[cur] = allocatedThreads.filter(t => t.host==cur).length, acc), {})
	ns.print("Allocated " + allocatedThreads.length + " threads to hack " + message.originId)
	let payload = new Payload("threads", allocatedThreadsByHost, message.originId)
	messageHandler.sendMessage(message.origin, payload)
}

async function freeThreads(ns, message, messageHandler) {
	ns.print("Received thread freeing request from " + message.origin + "(Origin ID: " + message.originId + ")")
	let threadsInfo = message.payload.info
	for(let i=0;i<Object.keys(threadsInfo).length;i++) {
		let host = Object.keys(threadsInfo)[i]
		let usedThreads = threads.filter(thread => thread.inUse == true && thread.host == host)
		usedThreads = usedThreads.slice(0, threadsInfo[host])
		usedThreads.map(thread => thread.inUse = false)
		ns.print("Deallocated " + threadsInfo[host] + " threads of " + host)
	}

}