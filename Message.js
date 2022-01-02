/** @param {NS} ns **/

export const Channels = {
	threadsRequest: 1, // Thread request message
	threadsAllocation: 2, // Thread request results
	threadsDeallocationRequest: 3, // Thread deallocation message
	hackStatus: 4, // Individual hack success/failure
	scriptStatus: 5, // Individual script status
	newHostForThreadManager: 6, // New host found message
	newHostForHackManager: 7, // New host found message
	hackReady: 8, // When the hack is ready
	threadsTotalRequest: 9, // Thread availability request
	threadsTotalResponse: 10 // Threads availability results
}

export function checkMessage(ns, port, hackId=null) {
	let response = ns.peek(port)
	if(response!="NULL PORT DATA") {
		let parsedResponse = JSON.parse(response)
		if(parsedResponse.hackId == hackId || hackId==null) {
			ns.readPort(port)
			return parsedResponse
		}
	}
	return false
}

export async function sendMessage(ns, message, port, hackId=null, status=1) {
	let writtenMessage = false
	let messageToSend
	while(!writtenMessage) {
		await ns.sleep(100)
		messageToSend = {
			hackId: hackId,
			status: status,
			message: message
		}
		writtenMessage = await ns.tryWritePort(port, JSON.stringify(messageToSend))
	}
}