/** @param {NS} ns **/
import { MessageHandler, Payload } from 'Message.js'

let mySelf = "hackScript"

export async function main(ns) {
	ns.disableLog('sleep')
	const target = ns.args[0]
	const originId = ns.args[1]

	const messageHandler = new MessageHandler(ns, mySelf)
	let results = await ns.grow(target)
	let payload = new Payload('grow', results, originId)
	await messageHandler.sendMessage("hackClass", payload)
}