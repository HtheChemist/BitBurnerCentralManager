/** @param {NS} ns **/
import {sendMessage, Channels} from 'Message.js'

export async function main(ns) {
	ns.disableLog('sleep')
	const target = ns.args[0]
	const myId = ns.args[1]
	let results = await ns.grow(target)
	await sendMessage(ns, { type: "grow", results: results }, Channels.scriptStatus, myId)
}