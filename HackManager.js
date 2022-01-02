/** @param {NS} ns **/
import {sendMessage, checkMessage, Channels} from 'Message.js'
import { hackOriginServer, hackClassScript } from 'Constants.js'

let currentHack // List of hack going on
let currentHackId // Current hack, to set the id of the next
let potentialHack // List of calculated hack
let hackedHost // List of hacked host (include private server)
let maxNumberOfHack

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('getHackTime')
	ns.disableLog('getServerGrowth')
	ns.disableLog('getServerMinSecurityLevel')
	ns.disableLog('getServerSecurityLevel')
	ns.disableLog('getServerMaxMoney')
	ns.disableLog('getServerMoneyAvailable')
	ns.disableLog('getServerMaxRam')
	ns.disableLog('getServerRequiredHackingLevel')

	hackedHost = []
	potentialHack = []
	currentHackId = 0
	currentHack = []
	maxNumberOfHack = Math.floor(ns.getServerMaxRam(hackOriginServer)/ns.getScriptRam(hackClassScript, hackOriginServer))

    while(true) {
		maxNumberOfHack = Math.floor(ns.getServerMaxRam(hackOriginServer)/ns.getScriptRam(hackClassScript, hackOriginServer))

		// Check for new host
		while(true) {
			let newHost = checkMessage(ns, Channels.newHostForHackManager)
			if(!newHost) {
				break
			}
			ns.print("Got a new host: " + newHost.message)
			addHost(ns, newHost.message)
			await ns.sleep(100)
		}
		if(currentHack.length<maxNumberOfHack) {
			// Calculate current potential hack
			calculateResults(ns)
			// Send hack
			if(potentialHack.length>0) {
				ns.print("Go hack")
				await sendHacks(ns)
			} else {
				ns.print("No hack")
			}
		}
		// This is a 5 second "sleep"
		for(let i=0;i<50;i++) {
			// Continue checking message during this 5 second
			let response = checkMessage(ns, Channels.hackStatus)
			if(response) {
				let finishedHackIndex = currentHack.findIndex(hack => hack.hackId == response.hackId)
				currentHack.splice(finishedHackIndex, 1)
				ns.print("Hack " + response.hackId + " finished: " + response.message)
				ns.print("Number of hack running: " + currentHack.length)
				await ns.sleep(500) // We need to ensure that the script close
				break // We break to recheck for a new hack
			}
			await ns.sleep(100)
		}
	}
}

function addHost(ns, host) {
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

async function getAvailableThreads(ns) {
	// Get available threads amount
	ns.print("Getting available threads")
	await sendMessage(ns, {amount: "available"}, Channels.threadsTotalRequest, "manager")
	while (true) {
		let response = checkMessage(ns, Channels.threadsTotalResponse, "manager")
		if (response) {
			ns.print("Available threads: " + response.message.threads)
			return response.message.threads
		}
		await ns.sleep(100)
	}
}


async function sendHacks(ns) {
	let availableThreads = -1
	for(let i=0;i<potentialHack.length;i++) {
		if(currentHack.length>=maxNumberOfHack) {
			ns.print("Max concurent hacks running")
			break
		}
		if(availableThreads<0) {
			availableThreads = await getAvailableThreads(ns)
		}
		let topHack = potentialHack[i]
		let neededThreads = topHack.hackThreadsRequirement + topHack.hackGrowThreads + topHack.hackWeakenThreads
		if(availableThreads<=0) {
			ns.print("No threads available")
			continue
		}
		if(neededThreads<=availableThreads) {
			// Start the hack
			ns.print("Starting top hack on: " + topHack.host)
			await startHack(ns, topHack)
			// Find and remove the other hack for this host
			let otherHackIndex = potentialHack.findIndex(hack => hack.host == topHack.host)
			if(otherHackIndex) {
				potentialHack.splice(otherHackIndex, 1)
			}
			potentialHack.splice(i, 1)
			availableThreads = await getAvailableThreads(ns)
		}
	}
	if(currentHack.length<1) {
		ns.print("Did not find any hack with enough thread")
	}
}

async function startHack(ns, hack) {
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
	currentHack.push({hackId: currentHackId, ...hack})
	// Awaiting hack to start before continuing
	while(true) {
		let response = checkMessage(ns, Channels.hackReady, currentHackId)
		if (response) {
			ns.tprint("Hack started")
			break
		}
		await ns.sleep(100)
	}
	currentHackId++
}

function calculateResults(ns) {
	ns.print("Calculating hacks")
	potentialHack = []
	for(let i=0; i<hackedHost.length; i++) {
		if(hackedHost[i].name.includes("pserv-")) {
			continue
		}
		if(Object.values(currentHack).find(hack => hack.host == hackedHost[i].name)) {
			continue
		}
		// Quick hack
		// We need to ensure that it return a valid number of thread for the hack
		if(ns.hackAnalyzeThreads(hackedHost[i].name, hackedHost[i].curMoney*0.5)>0) {
			potentialHack.push({
				host: hackedHost[i].name,
				hackTime: hackedHost[i].hackTime,
				hackValue: hackedHost[i].curMoney*0.5, // We aim for 50%
				hackThreadsRequirement: Math.ceil(ns.hackAnalyzeThreads(hackedHost[i].name, hackedHost[i].curMoney*0.5)),
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
	ns.print("Got " + potentialHack.length + " hacks")
	ns.print("Got " + potentialHack.filter(hack => hack.hackType=="quick").length + " quick hack")
	ns.print("Got " + potentialHack.filter(hack => hack.hackType=="full").length + " full hack")
	//return potentialHack
}