/** @param {NS} ns **/

export const Channels = {
	messageManager: 1, // Message Manager Port
	threadManager: 2, // Thread Manager Port
	serverManager: 3, // Server Manager Port
	hackManager: 4, // Hack Manager Port
	targetManager: 5, // Target Manager Port
	hackClass: 6, // Hack Port
	hackScript: 8 // Script Port
}

export class Payload {
	action
	info
	forId

	constructor(action, info=null, forId=null, ...more) {
		this.action = action
		this.forId = forId
		this.info = info
		if(more.length) {
			for(let i=0;i<Object.keys(more).length;i++) {
				let key = Object.keys(more)[i]
				this[key] = more[key]
			}
		}
	}
}

export class Message {
	origin
	destination
	payload
	originId

	constructor(origin, destination, payload, originId=null) {
		this.origin = origin
		this.destination = destination
		this.payload = payload
		this.originId = originId
	}

	get string() {
		return JSON.stringify({
			origin: this.origin,
			destination: this.destination,
			payload: this.payload,
			originId: this.originId
		})
	}
}

export class MessageHandler {
	origin
	originId
	ns
	messageQueue

	constructor(ns, origin, originId=null) {
		this.origin = origin
		this.ns = ns
		this.originId = originId
		this.messageQueue = []
	}

	async sendMessage(destination, payload) {
		let newMessage = new Message(this.origin, destination, payload, this.originId)
		while(true) {
			let writtenMessage = await this.ns.tryWritePort(Channels.messageManager, newMessage.string)
			if(writtenMessage) {
				break
			}
			await this.ns.sleep(100)
		}
	}

	checkMessage() {
		while(true) {
			let response = this.ns.peek(Channels[this.origin])
			if(response=="NULL PORT DATA") {
				break
			}
			let parsedMessage = JSON.parse(response)
			if(this.originId!=null && parsedMessage.payload.forId!=this.originId) {
				// Message is not for me
				break
			}
			let newMessage = new Message(parsedMessage.origin, parsedMessage.destination, parsedMessage.payload, parsedMessage.originId)
			this.messageQueue.push(newMessage)
			this.ns.readPort(Channels[this.origin])
		}
	}

	popLastMessage() {
		let firtMessage = this.messageQueue.splice(0,1)
		if(firtMessage) {
			return firtMessage[0]
		}
		return false
	}

	getMessagesInQueue(filter) {
		let messagesToReturn = this.messageQueue.filter(filter)
		let messagesLeft = this.messageQueue.filter(i => !filter(i))
		this.messageQueue = messagesLeft
		if(messagesToReturn.length>0) {
			return messagesToReturn
		}
		return false
	}
}