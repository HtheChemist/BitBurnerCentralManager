/** @param {NS} ns **/
// The HackClass manage a hack instance (request the thread and manage the timing)
// Emit a success or failure on port 4
// Listen for hack status on port 5

import { Payload, MessageHandler } from 'Message.js'
import { hackingScripts } from 'Constants.js'

let mySelf = "hackClass"

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('exec')

	let myId = ns.args[1]

	const messageHandler = new MessageHandler(ns, mySelf, myId)

	let hack = JSON.parse(ns.args[0])
	ns.print("Starting hack: " + myId)

	await run(ns, myId, hack, messageHandler)
	ns.print("Exiting")
}


async function run(ns, myId, hack, messageHandler) {
	let results
	if (hack.hackType == "quick") {
		ns.print("Quick hack")
		results = await quickHack(ns, myId, hack, messageHandler)
	} else {
		ns.print("Full hack")
		results = await fullHack(ns, myId, hack, messageHandler)
	}
	await messageHandler.sendMessage("hackManager", new Payload("hackDone", results))
}


async function quickHack(ns, id, hack, messageHandler) {
	let allocatedThreads = await getThreads(ns, messageHandler, hack.hackThreadsRequirement)

	ns.print('Hack ready')
	let payload = new Payload("hackReady")
	await messageHandler.sendMessage("hackManager", payload)

	if (!allocatedThreads) {
		ns.print("Hack lack required threads")
		return "Not enough threads"
	}
	let numberOfHackHost = Object.keys(allocatedThreads).length
	let hackResponseReceived = 0
	let hackValue = 0

	ns.print("Starting hack script on " + numberOfHackHost + " hosts")
	executeScript(ns, id, hack, hackingScripts.hack, allocatedThreads)
	ns.print("Awaiting hack confirmation")
	while (true) {
		messageHandler.checkMessage()
		let response = messageHandler.popLastMessage()
		if (response && response.payload.action == "hack") {
			hackResponseReceived++
			hackValue += response.payload.info
			ns.print("Received " + hackResponseReceived + "/" + numberOfHackHost + " hack results")
			if(hackResponseReceived>=numberOfHackHost) {
				ns.print("Hack script completed")
				await freeThreads(ns, messageHandler, allocatedThreads)
				return hackValue
			}
		}
		await ns.sleep(100)
	}
}

async function fullHack(ns, id, hack, messageHandler) {

	let growAllocatedThreads = await getThreads(ns, messageHandler, hack.hackGrowThreads)
	let weakenAllocatedThreads = await getThreads(ns, messageHandler, hack.hackWeakenThreads)
	let hackAllocatedThreads = await getThreads(ns, messageHandler, hack.hackThreadsRequirement)

	ns.print('Hack ready')
	let payload = new Payload("hackReady")
	await messageHandler.sendMessage("hackManager", payload)

	if (!growAllocatedThreads || !weakenAllocatedThreads || !hackAllocatedThreads) {
		ns.print("Hack lack required threads")
		return "Not enough threads"
	}

	let numberOfGrowHost = Object.keys(growAllocatedThreads).length
	let numberOfWeakenHost = Object.keys(weakenAllocatedThreads).length
	let numberOfHackHost = Object.keys(hackAllocatedThreads).length

	let growResponseReceived = 0
	let weakenResponseReceived = 0
	let hackResponseReceived = 0
	let hackValue = 0

	ns.print("Starting weaken script")
	executeScript(ns, id, hack, hackingScripts.weaken, weakenAllocatedThreads)
	ns.print("Starting grow script")
	executeScript(ns, id, hack, hackingScripts.grow, growAllocatedThreads)
	ns.print("Awaiting grow/weaken confirmation")
	while (true) {
		messageHandler.checkMessage()
		let response = messageHandler.popLastMessage()
		if (response && response.payload.action == "grow") {
			growResponseReceived++
			ns.print("Received " + growResponseReceived + "/" + numberOfGrowHost + " grow results")
		} else if (response && response.payload.action == "weaken") {
			weakenResponseReceived++
			ns.print("Received " + weakenResponseReceived + "/" + numberOfWeakenHost + " weaken results")
		}
		if(weakenResponseReceived>=numberOfWeakenHost && growResponseReceived>=numberOfGrowHost) {
			ns.print("Weaken and grow completed. Starting hack script.")
			executeScript(ns, id, hack, hackingScripts.hack, hackAllocatedThreads)
			await freeThreads(ns, messageHandler, growAllocatedThreads)
			await freeThreads(ns, messageHandler, weakenAllocatedThreads)
			break
		}
		await ns.sleep(100)
	}

	ns.print("Awaiting hack confirmation")
	while (true) {
		messageHandler.checkMessage()
		let response = messageHandler.popLastMessage()
		if (response && response.payload.action == "hack") {
			hackResponseReceived++
			hackValue += response.payload.info
			ns.print("Received " + hackResponseReceived + "/" + numberOfHackHost + " hack results")
			if(hackResponseReceived>=numberOfHackHost) {
				ns.print("Hack script completed")
				await freeThreads(ns, messageHandler, hackAllocatedThreads)
				return hackValue
			}
		}
		await ns.sleep(100)
	}

}

async function freeThreads(ns, messageHandler, allocatedThreads) {
	ns.print("Freeing threads")
	let payload = new Payload('freeThreads', allocatedThreads)
	await messageHandler.sendMessage("threadManager", payload)
}

async function getThreads(ns, messageHandler, number) {
	ns.print("Getting threads")
	let payload = new Payload('getThreads', number)
	await messageHandler.sendMessage("threadManager", payload)

	while (true) {
		messageHandler.checkMessage()
		let response = messageHandler.popLastMessage()
		if (response) {
			return response.payload.info
		}
		await ns.sleep(100)
	}
}

function executeScript(ns, myId, hack, script, allocatedThreads) {
	ns.print("Executing scripts")
	for (let i = 0; i < Object.keys(allocatedThreads).length; i++) {
		let keyName = Object.keys(allocatedThreads)[i]
		ns.exec(script, keyName, allocatedThreads[keyName], hack.host, myId)
	}
}