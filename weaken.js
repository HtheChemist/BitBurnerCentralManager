/** @param {NS} ns **/
import { sendMessage, Channels } from 'Message.js'

export async function main(ns) {
	ns.disableLog('sleep')
	const target = ns.args[0]
	const myId = ns.args[1]
	let results = await ns.weaken(target)
	await sendMessage(ns, { type: "weaken", results: results }, Channels.scriptStatus, myId)
}