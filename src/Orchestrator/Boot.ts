/** @param {NS} ns **/
import {
	BASE_DIR,
	BOOT_SCRIPTS,
	DEBUG,
	HACKING_SERVER,
	MANAGER_SCRIPTS,
	MANAGING_SERVER
} from "/Orchestrator/Config/Config";
import {NS} from "Bitburner";
import {ChannelName} from "/Orchestrator/Enum/MessageEnum";

export async function main(ns: NS) {
	const option: string = ns.args[0] as string
	let scriptList: string[] = BOOT_SCRIPTS

	if (option==="no-server-manager") scriptList = scriptList.filter(s => s!==ChannelName.serverManager)

	if (MANAGING_SERVER!=="home") {
		await ns.scp(ns.ls("home", BASE_DIR), "home", MANAGING_SERVER)
	}

	if (HACKING_SERVER!=="home") {
		await ns.scp(ns.ls("home", BASE_DIR), "home", MANAGING_SERVER)
	}

	for (let i = 0; i < scriptList.length; i++) {
		DEBUG && ns.tprint("Starting " + scriptList[i])
		ns.exec(MANAGER_SCRIPTS[scriptList[i]], MANAGING_SERVER);
		await ns.sleep(1000);
  }
}