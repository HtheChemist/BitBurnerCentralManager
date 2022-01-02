/** @param {NS} ns **/
import { initialRamAmount, hackOriginServer } from "Constants.js"

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('getPurchasedServerLimit')
	ns.disableLog('getPurchasedServers')
	ns.disableLog('getPurchasedServerCost')
	ns.disableLog('getServerMoneyAvailable')
	ns.disableLog('serverExists')
	ns.disableLog('purchaseServer')
	ns.disableLog('deleteServer')

	while (true) {
		if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
			while (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(initialRamAmount) && ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
				var numberOfServer = ns.getPurchasedServers().length
				var hostname = "pserv-" + numberOfServer
				await buyServer(ns, hostname, initialRamAmount)
			}
		}

		if (ns.getPurchasedServers().length == ns.getPurchasedServerLimit()) {
			// Try to upgrade the servers
			ns.print("Max server hit. Upgrading Server")
			await upgradeServer(ns)
		}
		await ns.sleep(1000 * 60)
	}

}

async function buyServer(ns, hostname, ram) {
	if (ns.serverExists(hostname)) {
		ns.killall(hostname)
		ns.deleteServer(hostname)
		ns.print("Deleted server " + hostname)
	}
	let newServer = ns.purchaseServer(hostname, ram)
	ns.print("Bough new server " + newServer + " with " + ram + " gb of ram")

}

async function upgradeServer(ns) {
	for (let k = 0; k < 10; k++) {
		let serverArray = ns.getPurchasedServers()
		let smallestRamValue = ns.getServerMaxRam(serverArray[0])
		let smallestServers = []
		// Finding what are the smallest servers
		for (let j = 0; j < serverArray.length; j++) {
			let curServer = serverArray[j]
			if (ns.getServerMaxRam(curServer) < smallestRamValue) {
				smallestServers = []
				smallestRamValue = ns.getServerMaxRam(curServer)
			}
			if (ns.getServerMaxRam(curServer) == smallestRamValue) {
				smallestServers.push(curServer)
			}
		}
		ns.print("Smallest servers have " + smallestRamValue + "gb. Count(" + smallestServers.length + ")")

		// Upgrading the server
		let priceCheck = ns.getPurchasedServerCost(smallestRamValue * 2)
		for (let i = 0; i < smallestServers.length; i++) {
			if(serverArray[i]==hackOriginServer) {
				continue
			}
			ns.print("Trying to update: " + serverArray[i])
			if (ns.getServerMoneyAvailable("home") > priceCheck) {
				await buyServer(ns, serverArray[i], smallestRamValue * 2)
			} else {
				ns.print("Not enough money. Requiring " + priceCheck)
				return
			}
		}
	}
}