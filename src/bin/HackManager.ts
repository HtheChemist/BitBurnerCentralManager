/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Payload, MessageHandler, Message, MessageActions} from './Class/Message'
import {HACKING_SCRIPTS, HACKING_SERVER, DEFAULT_HACKING_MODE, DEBUG, HACKING_CONDUCTOR} from './Config'
import {Hack, HackedHost} from "./Class/Hack";
import {MoneyHackAlgorithm} from "./HackAlgorithm/MoneyHackAlgorithm";
import {Action, ChannelName} from "./Enum/MessageEnum";
import {HackType} from "./Enum/HackEnum";
import {XPHackAlgorithm} from "./HackAlgorithm/XpHackAlgorithm";

const HackAlgorithm: Record<HackType, (ns: NS, currentHack: Hack[], hackedHost: HackedHost[]) => Hack[]> = {
	[HackType.fullMoneyHack]: MoneyHackAlgorithm,
	[HackType.quickMoneyHack]: MoneyHackAlgorithm,
	[HackType.xpHack]: XPHackAlgorithm,
}

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

	const mySelf: ChannelName = ChannelName.hackManager

	const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)

	const messageActions: MessageActions = {
		[Action.hackDone]: hackDone,
		[Action.addHost]: addHost,
	}

	const messageFilter = message => Object.keys(messageActions).includes(message.payload.action)

	const hackedHost: HackedHost[] = []
	let currentHackMode: HackType = DEFAULT_HACKING_MODE
	let currentHackId: number = 0
	let currentHack: Hack[] = []

    while(true) {
		const maxNumberOfHack: number = Math.floor(ns.getServerMaxRam(HACKING_SERVER)/ns.getScriptRam(hackClassScript, hackOriginServer))
		if(currentHack.length<maxNumberOfHack) {
			// Calculate current potential hack
			const potentialHack: Hack[] = HackAlgorithm[currentHackMode](ns, currentHack, hackedHost)
			// Send hack
			if(potentialHack.length>0) {
				await sendHacks(ns, messageHandler)
			}
		}
		// This is a 5 second "sleep"
		for(let i=0;i<50;i++) {
			messageHandler.checkMessage()
			let response: Message[] = messageHandler.getMessagesInQueue(messageFilter)
			if (response.length>0) {
				for(let j=0; j<response.length;j++) {
					await messageActions[response[j].payload.action]?.(response[j])
				}
			}
			await ns.sleep(100)
		}
	}

	async function hackDone(message: Message) {
		const hack: Hack|undefined = currentHack.find(h => h.id == message.originId)
		if(hack) {
			DEBUG && ns.print("Hack " + hack.id + " on " + hack.host + " finished: " + message.payload.info)
			currentHack = currentHack.filter(h => h.id !== message.originId)
		} else {
			DEBUG && ns.print("Finished hack cannot be found!")
		}
	}

	async function addHost(message: Message) {
		let host: string = message.payload.info as string
		hackedHost.push(new HackedHost(ns, host))
	}
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
	let scriptToExecute = xpFarm ? xpHackScript : hackClassScript
	for(let i=0;i<50;i++) {
		executed = ns.exec(scriptToExecute, hackOriginServer, 1, JSON.stringify(hack), currentHackId)
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

