/** @param {NS} ns **/
import { hackingScripts, requiredImport } from 'Constants.js'
import {Payload, MessageHandler} from 'Message.js'

let portOpener
let hackedHost
let checkedHost
let mySelf = "targetManager"

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('scp')
	ns.disableLog('scan')
	ns.disableLog('getHackingLevel')
	ns.disableLog('getServerRequiredHackingLevel')
	ns.disableLog('getServerNumPortsRequired')

	const messageHandler = new MessageHandler(ns, mySelf)

	const portCracker = [
		{ file: "BruteSSH.exe", function: ns.brutessh },
		{ file: "FTPCrack.exe", function: ns.ftpcrack },
		{ file: "relaySMTP.exe", function: ns.relaysmtp },
		{ file: "HTTPWorm.exe", function: ns.httpworm },
		{ file: "SQLInject.exe", function: ns.sqlinject }
	]

	portOpener = []
	for (let i = 0; i < portCracker.length; i++) {
		if (ns.fileExists(portCracker[i].file)) {
			portOpener.push(portCracker[i].function)
		}
	}

	let currentHost = ns.getHostname()

	checkedHost = []
	hackedHost = []

	while(true) {
		await scan_all(ns, currentHost, messageHandler)
		await ns.sleep(1000*60)
	}

}

async function scan_all(ns, base_host, messageHandler) {
	let hostArray = ns.scan(base_host)
	for (let i = 0; i < hostArray.length; i++) {
		var host = hostArray[i]
		if (host != "home" && !checkedHost.includes(host)) {
			checkedHost.push(host)
			if (checkHost(ns, host)) {
				ns.print("Found new host: " + host)
				for (let k = 0; k < Object.values(hackingScripts).length; k++) {
					await ns.scp(Object.values(hackingScripts)[k], host)
				}
				for (let k = 0; k < requiredImport.length; k++) {
					await ns.scp(requiredImport[k], host)
				}
				hackedHost.push(host)
				await broadcastNewHost(ns, host, messageHandler)
			}
			await scan_all(ns, host, messageHandler)
		}
	}
}

async function broadcastNewHost(ns, host, messageHandler) {
	let payload = new Payload('addHost', host)
	await messageHandler.sendMessage("threadManager", payload)
	await messageHandler.sendMessage("hackManager", payload)
}

function checkHost(ns, host) {
	if (ns.hasRootAccess(host)) {
		// Already root
		return true
	}
	if (ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(host)) {
		let requiredPort = ns.getServerNumPortsRequired(host)
		if (requiredPort <= portOpener.length) {
			// We have enough port cracker
			let portOpen = 0
			while (portOpen < requiredPort) {
				portOpener[portOpen](host)
				portOpen++
			}
		} else {
			// Not enough port cracker
			return false
		}
		// Can be hacked
		ns.nuke(host)
		return true
	} else {
		// Not enough hacking level
		return false
	}
}