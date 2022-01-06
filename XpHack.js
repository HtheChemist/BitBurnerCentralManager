import { Payload, MessageHandler } from 'Message.js'
import { hackingScripts } from 'Constants.js'

let mySelf = "hackClass"

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('exec')

	let myId = ns.args[1]

	const messageHandler = new MessageHandler(ns, mySelf, myId)

	let hack = JSON.parse(ns.args[0])
	ns.tprint("Starting hack: " + myId)

	let results = await run(ns, myId, hack, messageHandler)

	await messageHandler.sendMessage("hackManager", results)
	ns.print("Exiting")
}

async function run(ns, myId, hack, messageHandler) {
	let allocatedThreads = await getThreads(ns, messageHandler, 'max', false)

	ns.print('Hack ready')
	let payload = new Payload("hackReady", "", myId)
	await messageHandler.sendMessage("hackManager", payload)

    if (!allocatedThreads) {
		ns.print("Hack lack required threads")
		return new Payload("hackDone", "Not enough thread")
	}

	await xpFarmingLoop(ns, myId, hack, messageHandler, allocatedThreads)

}

// XP Farming hack is simply a loop
async function xpFarmingLoop(ns, myId, hack, messageHandler, allocatedThreads) {
	ns.tprint("Hack loop start/reset")
	let numberOfHost = Object.keys(allocatedThreads).length
	ns.print("Starting weaken script on " + numberOfHost + " hosts")
	executeScript(ns, myId, hack, hackingScripts.weaken, allocatedThreads)
	ns.print("Awaiting weaken confirmation")
	let responseReceived = 0
	while (true) {
		messageHandler.checkMessage()
		let response = messageHandler.popLastMessage()
		if (response) {
			// We will be able to insert a check for stopping the loop here
			responseReceived++
			ns.print("Received " + responseReceived + "/" + numberOfHost + " weaken results")
			if (responseReceived >= numberOfHost) {
				//let payload = new Payload("freeThreads", allocatedThreads)
				//messageHandler.sendMessage("threadManager", payload)
				//return new Payload("hackDone", response.payload.info)
				await xpFarmingLoop(ns, myId, hack, messageHandler, allocatedThreads)
			}
		}
		await ns.sleep(100)
	}
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