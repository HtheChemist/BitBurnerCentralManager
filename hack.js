/** @param {NS} ns **/
import { sendMessage, Channels } from 'Message.js'

export async function main(ns) {
	ns.disableLog('sleep')
	const target = ns.args[0]
	const myId = ns.args[1]
	//ns.tprint("Hack calling in: "+ myId)
	let results = await ns.hack(target)
	await sendMessage(ns, { type: "hack", results: results }, Channels.scriptStatus, myId)
	return
}