/** @param {NS} ns **/
// The HackClass manage a hack instance (request the thread and manage the timing)
// Emit a success or failure on port 4
// Listen for hack status on port 5

import { checkMessage, sendMessage, Channels } from 'Message.js'
import { hackingScripts } from 'Constants.js'

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('exec')

	let id = ns.args[1]
	let hack = JSON.parse(ns.args[0])
	ns.print("Starting hack: " + id)
	ns.print("Hack parameters: " + JSON.stringify(hack))

	await run(ns, id, hack)
	ns.print("Exiting")
}


async function run(ns, id, hack) {
	ns.print('Hack ready')
	await sendMessage(ns, "ready", Channels.hackReady, id, 1)
	let response
	if (hack.hackType == "quick") {
		ns.print("Quick hack")
		response = await quickHack(ns, id, hack)
	} else {
		ns.print("Full hack")
		response = await fullHack(ns, id, hack)
	}
	await sendMessage(ns, response.message, Channels.hackStatus, id, response.status)
}

async function quickHack(ns, id, hack) {
	let allocatedThreads = await getThreads(ns, id, hack.hackThreadsRequirement, false)
	if (!allocatedThreads) {
		ns.print("Hack lack required threads")
		return { message: "Not enough threads", status: 0 }
	}
	let numberOfHost = Object.keys(allocatedThreads).length
	ns.print("Starting hack script on " + numberOfHost + " hosts")
	executeScript(ns, id, hack, hackingScripts.hack, allocatedThreads)
	ns.print("Awaiting hack confirmation")
	let responseReceived = 0
	while (true) {
		await ns.sleep(100)
		let response = checkMessage(ns, Channels.scriptStatus, id)
		if (response) {
			responseReceived++
			ns.print("Received " + responseReceived + "/" + numberOfHost + " hack results")
			if(responseReceived>=numberOfHost) {
				ns.print("Hack script completed")
				await freeThreads(ns, id, allocatedThreads)
				return { message: response.message.results, status: 1 }
			}
		}
	}
}

async function fullHack(ns, id, hack) {

	let growAllocatedThreads = await getThreads(ns, id, hack.hackGrowThreads)
	let weakenAllocatedThreads = await getThreads(ns, id, hack.hackWeakenThreads)
	let hackAllocatedThreads = await getThreads(ns, id, hack.hackThreadsRequirement)

	if (!growAllocatedThreads || !weakenAllocatedThreads || !hackAllocatedThreads) {
		ns.print("Hack lack required threads")
		return { message: "Not enough threads", status: 0 }
	}

	let numberOfGrowHost = Object.keys(growAllocatedThreads).length
	let numberOfWeakenHost = Object.keys(weakenAllocatedThreads).length
	let numberOfHackHost = Object.keys(hackAllocatedThreads).length

	let growResponseReceived = 0
	let weakenResponseReceived = 0
	let hackResponseReceived = 0

	ns.print("Starting weaken script")
	executeScript(ns, id, hack, hackingScripts.weaken, weakenAllocatedThreads)
	ns.print("Starting grow script")
	executeScript(ns, id, hack, hackingScripts.grow, growAllocatedThreads)
	ns.print("Awaiting weaken confirmation")
	while (true) {
		await ns.sleep(100)
		let response = checkMessage(ns, Channels.scriptStatus, id)
		if (response && response.message.type == "grow") {
			growResponseReceived++
			ns.print("Received " + growResponseReceived + "/" + numberOfGrowHost + " grow results")
		} else if (response && response.message.type == "weaken") {
			weakenResponseReceived++
			ns.print("Received " + weakenResponseReceived + "/" + numberOfWeakenHost + " weaken results")
		}
		if(weakenResponseReceived>=numberOfWeakenHost && growResponseReceived>=numberOfGrowHost) {
			ns.print("Weaken and grow completed. Starting hack script.")
			executeScript(ns, id, hack, hackingScripts.hack, hackAllocatedThreads)
			await freeThreads(ns, id, growAllocatedThreads)
			await freeThreads(ns, id, weakenAllocatedThreads)
			break
		}
	}
	ns.print("Awaiting hack confirmation")
	while (true) {
		await ns.sleep(100)
		let response = checkMessage(ns, Channels.scriptStatus, id)
		if (response && response.message.type == "hack") {
			hackResponseReceived++
			if(hackResponseReceived>=numberOfHackHost) {
				ns.print("Hack script completed")
				await freeThreads(ns, id, hackAllocatedThreads)
				return { message: response.message.results, status: 1 }
			}
		}
	}

}

async function freeThreads(ns, id, allocatedThreads) {
	ns.print("Freeing threads")
	await sendMessage(ns, allocatedThreads, Channels.threadsDeallocationRequest, id)
}

async function getThreads(ns, id, number, exact = true) {
	ns.print("Getting threads")
	let message = { amount: number, exact: exact }
	await sendMessage(ns, message, Channels.threadsRequest, id)
	while (true) {
		let response = checkMessage(ns, Channels.threadsAllocation, id)
		if (response) {
			return response.message.threads
		}
		await ns.sleep(100)
	}
}

function executeScript(ns, id, hack, script, allocatedThreads) {
	for(let i=0;i<Object.keys(allocatedThreads).length;i++) {
		let keyName = Object.keys(allocatedThreads)[i]
		ns.exec(script, keyName, allocatedThreads[keyName], hack.host, id)
	}
}