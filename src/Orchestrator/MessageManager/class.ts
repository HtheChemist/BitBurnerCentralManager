/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Action, Channel, ChannelName} from "/Orchestrator/MessageManager/enum";

export const NULL_PORT_DATA = "NULL PORT DATA";

export type MessageActions = Partial<Record<Action, (m: Message) => (void | Promise<void>)>>
export type PayloadData = string | Record<string, string | number | boolean | null> | null | number | boolean | string[]

export class Payload {
    action: Action
    info: PayloadData
    extra: PayloadData

    constructor(action, info?: PayloadData, extra?: PayloadData) {
        this.action = action
        this.info = info || null
        this.extra = extra !== undefined ? extra : null
    }
}

export interface IMessage {
    origin: ChannelName
    destination: ChannelName
    payload: Payload
    originId: number | null
    destinationId: number | null
    comPort: number
    sentTime: number | null
    dispatchedTime: number | null
}

export interface IMessageTagged {
    channel: number
    message: Message
}

export class Message implements IMessage {
    origin: ChannelName
    destination: ChannelName
    payload: Payload
    originId: number | null
    destinationId: number | null
    comPort: number
    sentTime: number | null
    dispatchedTime: number | null

    constructor(comPort: number,origin: ChannelName, destination: ChannelName, payload: Payload, originId: number | null = null, destinationId: number | null = null, sentTime: number | null = null, dispatchedTime: number | null = null) {
        this.origin = origin
        this.destination = destination
        this.payload = payload
        this.originId = originId
        this.destinationId = destinationId
        this.comPort = comPort
        this.sentTime = sentTime
        this.dispatchedTime = dispatchedTime
    }

    get string(): string {
        return JSON.stringify({
            origin: this.origin,
            destination: this.destination,
            payload: this.payload,
            originId: this.originId,
            destinationId: this.destinationId,
            comPort: this.comPort,
            sentTime: this.sentTime,
            dispatchedTime: this.dispatchedTime
        })
    }

    static fromJSON(json: string): Message {
        //console.log("Parsing JSON: " + json)
        const {origin, destination, payload, originId, destinationId, comPort, sentTime, dispatchedTime}: IMessage = JSON.parse(json)
        return new Message(comPort, origin, destination, payload, originId, destinationId, sentTime, dispatchedTime)
    }
}

export class MessageHandler {
    origin: ChannelName
    originId: number | null
    ns: NS
    messageQueue: Message[]
    messageChannel: Channel

    constructor(ns: NS, origin: ChannelName, originId: number | null = null) {
        this.origin = origin
        this.ns = ns
        this.originId = originId
        this.messageQueue = []
        this.messageChannel = Math.ceil(Math.random() * 20 )
        //this.messageChannel = CommunicationChannels[Math.floor(Math.random() * CommunicationChannels.length)]
    }

    async sendMessage(destination: ChannelName, payload: Payload, destinationId: number | null = null) {
        let newMessage: Message = new Message(this.messageChannel, this.origin, destination, payload, this.originId, destinationId)
        newMessage.sentTime = Date.now()
        //console.log("Sending message: " + newMessage.string)
        let ntry = 10
        for (let i=0; i<ntry; i++) {
            const messageWritten: boolean = await this.ns.tryWritePort(this.messageChannel, newMessage.string)
            if (messageWritten) return
            await this.ns.sleep(100)
        }
        this.ns.print("MESSAGE LOST: " + newMessage.string)
    }

    async clearMyMessage() {
        await this.sendMessage(ChannelName.messageManager, new Payload(Action.clearMyMessage))
    }

    async checkMessage(filter?: (m: Message) => boolean) {
        const payload: Payload = filter ? new Payload(Action.messageRequest, filter.toString()) : new Payload(Action.messageRequest)
        await this.sendMessage(ChannelName.messageManager, payload)
        let numberTry: number = 0
        while (numberTry<100) {
            let response: string = this.ns.peek(this.messageChannel)
            if (response === NULL_PORT_DATA) {
                await this.ns.sleep(100)
                numberTry++
                continue
            }
            let parsedMessage: Message = Message.fromJSON(response)
            /////////////////////////
            ////////////////////////
            /// Bug ici

            if (parsedMessage.destination === this.origin && parsedMessage.destinationId === this.originId) {
                // if (this.originId !== null && parsedMessage.destinationId !== this.originId) {
                //     await this.ns.sleep(10)
                //     numberTry++
                //     continue
                // }
                this.ns.readPort(this.messageChannel)
                if (parsedMessage.payload.action === Action.noMessage) {
                    break
                }
                this.messageQueue.push(parsedMessage)
            }
            await this.ns.sleep(10)
        }
    }

    async popLastMessage(): Promise<Message[]> {
        await this.checkMessage()
        const response = this.messageQueue.splice(0, 1)
        if (response) {
            return response
        }
        return []
    }

    async getMessagesInQueue(filter?: (m: Message) => boolean): Promise<Message[]> {
        await this.checkMessage(filter)
        let messagesToReturn: Message[] = filter ? this.messageQueue.filter(filter) : this.messageQueue
        this.messageQueue = filter ? this.messageQueue.filter(m => !filter(m)) : []
        return messagesToReturn
    }

    async waitForAnswer(filter?: (m: Message) => boolean, timeToWait: number = 10000): Promise<Message[]> {
        const numberOfCycle: number = Math.floor(timeToWait/100)
        for (let i = 0; i < numberOfCycle; i++) {
        //while(true) {
            let response: Message[] = filter ? await this.getMessagesInQueue(filter) : await this.popLastMessage()
            if (response.length > 0) {
                return response
            }
            await this.ns.sleep(100)
        }
        //this.ns.tprint("Expected message not received!")
        return []
    }

    async sendAndWait(destination: ChannelName, payload: Payload, destinationId: number | null = null, retry: boolean = false, filter?): Promise<Message[]> {
        let numberOfTry: number = 1
        if (retry) {
            numberOfTry = 10
        }
        for (let i = 0; i < numberOfTry; i++) {
            await this.sendMessage(destination, payload, destinationId)
            const response: Message[] = await this.waitForAnswer(filter)
            if (response.length>0) {
                return response
            }
            await this.ns.sleep(100)
        }
        return []
    }
}