/** @param {NS} ns **/
import {hackOriginServer, hackOriginServerImport} from "Constants.js"

export async function main(ns) {
	for(let i=0;i<hackOriginServerImport.length;i++) {
		await ns.scp(hackOriginServerImport[i], hackOriginServer)
	}
	ns.run('ThreadManager.js')
	await ns.sleep(1000)
	ns.run('HackManager.js')
	await ns.sleep(1000)
	//ns.run('ServerManager.js')
	//await ns.sleep(1000)
	ns.run('TargetManager.js')
}