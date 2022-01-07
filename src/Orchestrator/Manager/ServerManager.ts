/** @param {NS} ns **/
import {NS} from "Bitburner";
import {DEBUG, SERVER_INITIAL_RAM} from "/Orchestrator/Config/Config";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {MessageHandler, Payload} from "/Orchestrator/Class/Message";

export async function main(ns: NS) {
	ns.disableLog('sleep')
	ns.disableLog('getPurchasedServerLimit')
	ns.disableLog('getPurchasedServers')
	ns.disableLog('getPurchasedServerCost')
	ns.disableLog('getServerMoneyAvailable')
	ns.disableLog('serverExists')
	ns.disableLog('purchaseServer')
	ns.disableLog('deleteServer')
	ns.disableLog('getServerMaxRam')

	const mySelf: ChannelName = ChannelName.serverManager

	const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)

	let hackPaused: boolean = false

	while (true) {
		if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
			while (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(SERVER_INITIAL_RAM) && ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
				const numberOfServer: number = ns.getPurchasedServers().length
				const hostname: string = "pserv-" + numberOfServer
				await buyServer(hostname, SERVER_INITIAL_RAM)
			}
		}

		if (ns.getPurchasedServers().length == ns.getPurchasedServerLimit()) {
			// Try to upgrade the servers
			DEBUG && ns.print("Max server hit. Upgrading Server")
			await upgradeServer()
		}
		if(!hackPaused) {
			await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.resume))
		}
		await ns.sleep(1000 * 60)
	}

	async function upgradeServer() {
		for (let k = 0; k < 10; k++) {
			let serverArray: string[] = ns.getPurchasedServers()
			let smallestRamValue: number = ns.getServerMaxRam(serverArray[1])
			let smallestServers: string[] = []
			// Finding what are the smallest servers
			for (let j = 1; j < serverArray.length; j++) {
				let curServer: string = serverArray[j]
				if (ns.getServerMaxRam(curServer) < smallestRamValue) {
					smallestServers = []
					smallestRamValue = ns.getServerMaxRam(curServer)
				}
				if (ns.getServerMaxRam(curServer) == smallestRamValue) {
					smallestServers.push(curServer)
				}
			}
			DEBUG && ns.print("Smallest servers have " + smallestRamValue + "gb. Count(" + smallestServers.length + ")")
			// Upgrading the server
			let priceCheck = ns.getPurchasedServerCost(smallestRamValue * 2)
			for (let i = 1; i < smallestServers.length; i++) {
				DEBUG && ns.print("Trying to update: " + serverArray[i])
				if (ns.getServerMoneyAvailable("home") > priceCheck) {
					await buyServer(serverArray[i], smallestRamValue * 2)
				} else {
					DEBUG && ns.print("Not enough money. Requiring " + priceCheck)
					return
				}
			}
		}
	}
	async function buyServer(hostname: string, ram: number) {
		if(!hackPaused) {
			await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.pause))
			await messageHandler.waitForAnswer()
		}
		if (ns.serverExists(hostname)) {
			ns.killall(hostname)
			ns.deleteServer(hostname)
			DEBUG && ns.print("Deleted server " + hostname)
		}
		let newServer = ns.purchaseServer(hostname, ram)
		DEBUG && ns.print("Bough new server " + newServer + " with " + ram + " gb of ram")
	}
}

