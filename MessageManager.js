/** @param {NS} ns **/
// Message: {destination: port, source: port, payload: {identifier: number, message: any}}
import {Channels} from 'Message.js'

let messageManagerPort = 1


export async function main(ns) {
	let messageQueue = []
	while(true) {
		receiveMessage(ns, messageQueue)
		messageQueue = await sendMessage(ns, messageQueue)
		await ns.sleep(10)
	}

}

async function sendMessage(ns, messageQueue) {
	let newQueue = []
	for(let i=0;i<messageQueue.length;i++) {
		let port = Channels[messageQueue[i].destination]
		let writtenMessage = await ns.tryWritePort(port, JSON.stringify(messageQueue[i]))
		if(!writtenMessage) {
			newQueue.push(messageQueue[i])
		}
	}
	return newQueue
}

async function receiveMessage(ns, messageQueue) {
	let response = ns.readPort(messageManagerPort)
	if(response!="NULL PORT DATA") {
		let parsedResponse = JSON.parse(response)
		messageQueue.push(parsedResponse)
	}
}