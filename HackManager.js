/** @param {NS} ns **/
import {Payload, MessageHandler} from 'Message.js'
import { hackOriginServer, hackClassScript, xpFarm } from 'Constants.js'

let mySelf = "hackManager"

let currentHack // List of hack going on
let currentHackId // Current hack, to set the id of the next
let potentialHack // List of calculated hack
let hackedHost // List of hacked host (include private server)
let maxNumberOfHack


export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('exec')
	ns.disableLog('getHackTime')
	ns.disableLog('getServerGrowth')
	ns.disableLog('getServerMinSecurityLevel')
	ns.disableLog('getServerSecurityLevel')
	ns.disableLog('getServerMaxMoney')
	ns.disableLog('getServerMoneyAvailable')
	ns.disableLog('getServerMaxRam')
	ns.disableLog('getServerRequiredHackingLevel')

	const messageHandler = new MessageHandler(ns, mySelf)

	const messageActions = {
		hackDone: hackDone,
		addHost: addHost,
	}

	const messageFilter = message => Object.keys(messageActions).includes(message.payload.action)

	hackedHost = []
	potentialHack = []
	currentHackId = 0
	currentHack = []
	maxNumberOfHack = Math.floor(ns.getServerMaxRam(hackOriginServer)/ns.getScriptRam(hackClassScript, hackOriginServer))

    while(true) {
		maxNumberOfHack = Math.floor(ns.getServerMaxRam(hackOriginServer)/ns.getScriptRam(hackClassScript, hackOriginServer))
		if(currentHack.length<maxNumberOfHack) {
			// Calculate current potential hack
			calculateResults(ns)
			// Send hack
			if(potentialHack.length>0) {
				await sendHacks(ns, messageHandler)
			}
		}
		// This is a 5 second "sleep"
		for(let i=0;i<50;i++) {
			messageHandler.checkMessage()
			let response = messageHandler.getMessagesInQueue(messageFilter)
			if (response.length>0) {
				for(let j=0; j<response.length;j++) {
					await messageActions[response[j].payload.action](ns, response[j], messageHandler)
				}
			}
			await ns.sleep(100)
		}
	}
}

async function hackDone(ns, message, messageHandler) {
	let hack = currentHack.find(h => h.id == message.originId)
	ns.print("Hack " + hack.id + " on " + hack.host + " finished: " + message.payload.info)
	currentHack = currentHack.filter(h => h.id != message.originId)
}

async function addHost(ns, message, messageHandler) {
	let host = message.payload.info
	hackedHost.push({
		name: host,
		hackTime: ns.getHackTime(host),
		growRate: ns.getServerGrowth(host)/100,
		minSecurity: ns.getServerMinSecurityLevel(host),
		curSecurity: ns.getServerSecurityLevel(host),
		maxMoney: ns.getServerMaxMoney(host),
		curMoney: ns.getServerMoneyAvailable(host),
		ram: ns.getServerMaxRam(host),
		hackingRequired: ns.getServerRequiredHackingLevel(host)
	})
}

async function getAvailableThreads(ns, messageHandler) {
	// Get available threads amount
	let messageFilter = m => m.payload.action == "availableThreads"
	let payload = new Payload("getAvailableThreads")
	await messageHandler.sendMessage("threadManager", payload)
	while (true) {
		messageHandler.checkMessage()
		let response = messageHandler.getMessagesInQueue(messageFilter)
		if (response.length>0) {
			return response[0].payload.info
		}
		await ns.sleep(100)
	}
}


async function sendHacks(ns, messageHandler) {
	let availableThreads = -1
	for(let i=0;i<potentialHack.length;i++) {
		if(currentHack.length>=maxNumberOfHack) {
			ns.print("Max concurent hacks running")
			break
		}
		if(availableThreads<0) {
			availableThreads = await getAvailableThreads(ns, messageHandler)
		}
		let topHack = potentialHack[i]
		let neededThreads = topHack.hackThreadsRequirement + topHack.hackGrowThreads + topHack.hackWeakenThreads
		if(availableThreads<=0) {
			ns.print("No threads available")
			continue
		}
		if(neededThreads<=availableThreads) {
			// Start the hack
			await startHack(ns, topHack, messageHandler)
			// Find and remove the other hack for this host
			potentialHack = potentialHack.filter(hack => hack.host != topHack.host)
			availableThreads = await getAvailableThreads(ns, messageHandler)
		}
	}
	if(currentHack.length<1) {
		ns.print("Did not find any hack with enough thread")
	}
}


async function startHack(ns, hack, messageHandler) {
	ns.print("Sending " + hack.hackType + " hack to " + hack.host)
	let executed = 0
	for(let i=0;i<50;i++) {
		executed = ns.exec(hackClassScript, hackOriginServer, 1, JSON.stringify(hack), currentHackId)
		if(executed>0) {
			break
		}
		await ns.sleep(100)
	}
	if(executed==0) {
		ns.print("Unable to start hack")
		return
	}
	currentHack.push({id: currentHackId, ...hack})
	// Awaiting hack to start before continuing, could probably be skipped when everything is more stable
	let messageFilter = (m) => m.payload.action == "hackReady"
	while(true) {
		messageHandler.checkMessage()
		let response = messageHandler.getMessagesInQueue(messageFilter)
		if (response.length>0) {
			currentHackId++
			return
		}
		await ns.sleep(100)
	}
}

function calculateResults(ns) {
	ns.print("Calculating hacks")
	potentialHack = []
	for(let i=0; i<hackedHost.length; i++) {
		if(hackedHost[i].name.includes("pserv-")) {
			continue
		}
		if(currentHack.find(h => h.host == hackedHost[i].name)) {
			continue
		}

		// XP farm
		if(xpFarm) {
			let wt = hackedHost[i].hackTime*4
			let ms = hackedHost[i].minSecurity
			potentialHack.push({
				host: hackedHost[i].name,
				hackTime: 1,
				hackValue: 100, // We aim for 50%
				hackThreadsRequirement: 0,
				hackGrowThreads: 0,
				hackWeakenThreads: 0,
				hackDerivativeValue: (3+(ms*0.3))/wt,
				hackType: "xp"
			})
		} else {
			// Quick hack
			// We need to ensure that it return a valid number of thread for the hack
			let tr = ns.hackAnalyzeThreads(hackedHost[i].name, hackedHost[i].curMoney*0.5)
			if(tr>0) {
				potentialHack.push({
					host: hackedHost[i].name,
					hackTime: hackedHost[i].hackTime,
					hackValue: hackedHost[i].curMoney*0.5, // We aim for 50%
					hackThreadsRequirement: Math.ceil(tr),
					hackGrowThreads: 0,
					hackWeakenThreads: 0,
					hackDerivativeValue: hackedHost[i].curMoney*0.5/hackedHost[i].hackTime,
					hackType: "quick"
				})
			}

			// Full hack
			// Thread required to grow to max:
			// max = old*(rate)^thread
			var serverGrowth = Math.min(1 + 0.03 / hackedHost[i].curSecurity, 1.0035)
			var growThread = Math.ceil((Math.log(hackedHost[i].maxMoney/hackedHost[i].curMoney)/Math.log(serverGrowth))/hackedHost[i].growRate)
			if(!Number.isFinite(growThread) || growThread == 0) {
				continue
			}
			// Calculate Total Security, considering Grow
			var weakenThread = Math.ceil(((hackedHost[i].curSecurity-hackedHost[i].minSecurity)+(growThread*0.004))/0.005)
			//hackedHost[i].weakenThread = weakenThread

			// Calculate Hacked Amount
			var percentHacked = ns.hackAnalyze(hackedHost[i].name)

			// Save full hack
			potentialHack.push({
				host: hackedHost[i].name,
				hackValue: hackedHost[i].maxMoney*0.5, // We aim for 50%
				hackTime: hackedHost[i].hackTime*5,
				hackThreadsRequirement: Math.ceil((hackedHost[i].maxMoney*0.5)/(percentHacked * hackedHost[i].maxMoney)),
				hackGrowThreads: growThread,
				hackWeakenThreads: weakenThread,
				hackDerivativeValue: hackedHost[i].maxMoney*0.5/hackedHost[i].hackTime*5,
				hackType: "full"
			})
		}
	}
	// Sort potentialHack by value.
	potentialHack.sort((a,b) => {
		if(a.hackDerivativeValue < b.hackDerivativeValue) {
			return 1
		}
		if(a.hackDerivativeValue > b.hackDerivativeValue) {
			return -1
		}
		return 0
	})

	if(xpFarm && potentialHack.length>0) {
		potentialHack = [potentialHack[0]]
	}
	ns.print("Got " + potentialHack.length + " hacks")
	ns.print("Got " + potentialHack.filter(hack => hack.hackType=="quick").length + " quick hack")
	ns.print("Got " + potentialHack.filter(hack => hack.hackType=="full").length + " full hack")
}