/** @param {NS} ns **/
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {
	DEBUG,
	HACKING_SCRIPTS,
	IMPORT_TO_COPY,
} from "/Orchestrator/Config/Config";
import {MessageHandler, Payload} from "/Orchestrator/Class/Message";

export async function main(ns) {
	ns.disableLog("sleep");
	ns.disableLog("scp");
	ns.disableLog("scan");
	ns.disableLog("getHackingLevel");
	ns.disableLog("getServerRequiredHackingLevel");
	ns.disableLog("getServerNumPortsRequired");
	ns.disableLog("nuke");

	const mySelf: ChannelName = ChannelName.threadManager;
	const messageHandler = new MessageHandler(ns, mySelf);

	const portCracker = [
		{file: "BruteSSH.exe", function: ns.brutessh},
		{file: "FTPCrack.exe", function: ns.ftpcrack},
		{file: "relaySMTP.exe", function: ns.relaysmtp},
		{file: "HTTPWorm.exe", function: ns.httpworm},
		{file: "SQLInject.exe", function: ns.sqlinject},
	];

	const portOpener: ((h: string) => void)[] = [];
	for (let i = 0; i < portCracker.length; i++) {
		if (ns.fileExists(portCracker[i].file)) {
			portOpener.push(portCracker[i].function);
		}
	}

	const currentHost: string = ns.getHostname();
	const hackedHost: string[] = [];
	let checkedHost: string[] = [];

	while (true) {
		checkedHost = []
		await scan_all(currentHost);
		await ns.sleep(1000 * 60);
	}

	async function scan_all(base_host) {
		let hostArray: string[] = ns.scan(base_host);
		for (let i = 0; i < hostArray.length; i++) {
			const host: string = hostArray[i];
			if (host != "home" && !checkedHost.includes(host)) {
				checkedHost.push(host);
				if (checkHost(host) && !hackedHost.includes(host)) {
					DEBUG && ns.print("Found new host: " + host);
					// We ns.rm before since there seems to be a bug with cached import: https://github.com/danielyxie/bitburner/issues/2413
					for (let j=0;j<Object.values(HACKING_SCRIPTS).length;j++) {
						const script: string = Object.values(HACKING_SCRIPTS)[j]
						ns.rm(script, host)
						await ns.scp(script, "home", host);
					}
					for (let j=0;j<IMPORT_TO_COPY.length;j++) {
						const script: string = IMPORT_TO_COPY[j]
						ns.rm(script, host)
						await ns.scp(script, "home", host);
					}

					hackedHost.push(host);
					await broadcastNewHost(host);
				}
				await ns.sleep(100)
				await scan_all(host);
			}
		}
	}

	function checkHost(host: string): boolean {
		if (ns.hasRootAccess(host)) {
			// Already root
			return true;
		}
		if (ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(host)) {
			const requiredPort: number = ns.getServerNumPortsRequired(host);
			if (requiredPort <= portOpener.length) {
				// We have enough port cracker
				let portOpen = 0;
				while (portOpen < requiredPort) {
					portOpener[portOpen](host);
					portOpen++;
				}
			} else {
				// Not enough port cracker
				return false;
			}
			// Can be hacked
			ns.nuke(host);
			return true;
		} else {
			// Not enough hacking level
			return false;
		}
	}

	async function broadcastNewHost(host) {
		const payload = new Payload(Action.addHost, host);
		await messageHandler.sendMessage(ChannelName.threadManager, payload);
		await messageHandler.sendMessage(ChannelName.hackManager, payload);
	}
}


