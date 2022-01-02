/** @param {NS} ns **/

// The threadManager listen for thread request on port 1, answer request on port 2 and
// listen for threads deallocation on port 3, and new host on port 6

// threadRequest format: {hackId: string, status: bool, message: {amount: number}}
// -> response format: {hackId: string, status: bool, message: {threads: {[host]: number}}
// freeThreads format: {hackId: string, status: bool, message: {[host]: number}}

import {checkMessage, sendMessage, Channels} from 'Message.js'
import {hackingScripts, hackOriginServer} from 'Constants.js'

let threads
let ramChunk

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('getScriptRam')
	ns.disableLog('getServerMaxRam')

	ramChunk = Math.max(...Object.values(hackingScripts).map(script => ns.getScriptRam(script)))
	threads = []
	while(true) {
		await ns.sleep(100)
		// Check for new host
		while(true) {
			let newHost = checkMessage(ns, Channels.newHostForThreadManager)
			if(!newHost) {
				break
			}
			addHost(ns, newHost.message)
			await ns.sleep(100)
		}
		// Check for new thread request
		let threadRequest = checkMessage(ns, Channels.threadsRequest)
		if(threadRequest) {
			ns.print("Received threads request from hack " + threadRequest.hackId)
			let threadRequirement = threadRequest.message
			let allocatedThreads = allocateThreads(ns, threadRequirement.amount, threadRequirement.exact)
			let response = {threads: allocatedThreads}
			ns.print("Allocated " + response.threads + " threads to hack " + threadRequest.hackId)

			await sendMessage(ns, response, Channels.threadsAllocation, threadRequest.hackId)
		}
		// Check for available thread
		let threadAvailableRequest = checkMessage(ns, Channels.threadsTotalRequest)
		if(threadAvailableRequest) {
			let available = {threads: getAvailableThreads()}
			ns.print("Available threads: " + available.threads + ". Sending to " + threadAvailableRequest.hackId)

			await sendMessage(ns, available, Channels.threadsTotalResponse, threadAvailableRequest.hackId)
		}
		// Check for new thread freeing request
		let freeThreads = checkMessage(ns, 3)
		if(freeThreads) {
			ns.print("Received thread freeing request from " + freeThreads.hackId)
			for(let i=0;i<Object.keys(freeThreads.message).length;i++) {
				let key = Object.keys(freeThreads.message)[i]
				deallocateThreads(freeThreads.message[key], key)
				ns.print("Deallocated " + freeThreads.message[key] + " threads of " + key)
			}
		}
	}
}

function addHost(ns, host) {
	if(host==hackOriginServer) {
		return
	}
	let hostThreads = Math.floor(ns.getServerMaxRam(host)/ramChunk)
	ns.print("Got new host: " + host + " with " + hostThreads + " threads")
	for(let j=0;j<hostThreads;j++) {
		threads.push({
			host: host,
			inUse: false
		})
	}
}

function getAvailableThreads() {
	return threads.filter(thread => thread.inUse == false).length
}

function allocateThreads(ns,number, exact=true) {
	let unusedThreads = threads.filter(thread => thread.inUse == false)
	if(unusedThreads.length<number && exact) {
		return false
	}
	let allocatedThreads = unusedThreads.slice(0, number)
	allocatedThreads.map(thread => thread.inUse = true)
	let allocatedThreadsByHost = {}
	for(let i=0;i<allocatedThreads.length;i++){
		if(allocatedThreadsByHost[allocatedThreads[i].host]) {
			allocatedThreadsByHost[allocatedThreads[i].host]++
		} else {
			allocatedThreadsByHost[allocatedThreads[i].host] = 1
		}
	}
	ns.print("Allocated " + allocatedThreads.length + " threads")
	return allocatedThreadsByHost
}

function deallocateThreads(number, host) {
	let usedThreads = threads.filter(thread => thread.inUse == true && thread.host == host)
	usedThreads = usedThreads.slice(0, number)
	usedThreads.map(thread => thread.inUse = false)
}