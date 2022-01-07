/** @param {NS} ns **/
import {BOOT_SCRIPT} from "/Orchestrator/Config/Config";

export async function main(ns) {
	for (let i = 0; i < BOOT_SCRIPT.length; i++) {
		ns.run(BOOT_SCRIPT[i]);
		await ns.sleep(1000);
  }
}