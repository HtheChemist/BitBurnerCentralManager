/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Action, Channel, ChannelName} from "../Enum/MessageEnum";

const NULL_PORT_DATA = "NULL PORT DATA"

export type MessageActions = Partial<Record<Action, (m: Message) => (void|Promise<void>)>>
type PayloadData = string|Record<string, string|number>|null|number|boolean

export class Payload {
	action: Action
	info: PayloadData
	extra: PayloadData

	constructor(action, info?: PayloadData, extra?: PayloadData) {
		this.action = action
		this.info = info || null
		this.extra = extra || null
	}
}

export interface IMessage {
	origin: ChannelName
	destination: ChannelName
	payload: Payload
	originId: number|null
	destinationId: number|null
}

export class Message implements IMessage{
	origin: ChannelName
	destination: ChannelName
	payload: Payload
	originId: number|null
	destinationId: number|null

	constructor(origin: ChannelName, destination: ChannelName, payload: Payload, originId: number|null = null, destinationId: number|null = null) {
		this.origin = origin
		this.destination = destination
		this.payload = payload
		this.originId = originId
		this.destinationId = destinationId
	}

	get string(): string {
		return JSON.stringify({
			origin: this.origin,
			destination: this.destination,
			payload: this.payload,
			originId: this.originId,
			destinationId: this.destinationId
		})
	}

	static fromJSON(json: string): Message {
		const {origin, destination, payload, originId, destinationId}: IMessage = JSON.parse(json)
		return new Message(origin, destination, payload, originId, destinationId)
	}
}

export class MessageHandler {
	origin: ChannelName
	originId: number|null
	ns: NS
	messageQueue: Message[]

	constructor(ns: NS, origin: ChannelName, originId: number|null = null) {
		this.origin = origin
		this.ns = ns
		this.originId = originId
		this.messageQueue = []
	}

	async sendMessage(destination: ChannelName, payload: Payload, destinationId: number | null = null) {
		let newMessage: Message = new Message(this.origin, destination, payload, this.originId, destinationId)
		let messageWritten: boolean = false
		while(!messageWritten) {
			messageWritten = await this.ns.tryWritePort(Channel.messageManager, newMessage.string)
			await this.ns.sleep(100)
		}
	}

	checkMessage() {
		while(true) {
			let response: string = this.ns.peek(Channel[this.origin])
			if(response===NULL_PORT_DATA) {
				break
			}
			let parsedMessage: Message = Message.fromJSON(response)
			if(this.originId!==null && parsedMessage.destinationId!==this.originId) {
				// Message is not for me
				break
			}
			this.messageQueue.push(parsedMessage)
			this.ns.readPort(Channel[this.origin])
		}
	}

	popLastMessage(): boolean|Message {
		let firstMessage: Message[] = this.messageQueue.splice(0,1)
		if(firstMessage.length>0) {
			return firstMessage[0]
		}
		return false
	}

	getMessagesInQueue(filter: (m: Message) => boolean): Message[] {
		let messagesToReturn: Message[] = this.messageQueue.filter(filter)
		this.messageQueue = this.messageQueue.filter(m => !filter(m))
		return messagesToReturn
	}
}