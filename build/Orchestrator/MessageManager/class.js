import { Action, ChannelName } from "/Orchestrator/MessageManager/enum";
export const NULL_PORT_DATA = "NULL PORT DATA";
export class Payload {
    constructor(action, info, extra) {
        this.action = action;
        this.info = info || null;
        this.extra = extra !== undefined ? extra : null;
    }
}
export class Message {
    constructor(comPort, origin, destination, payload, originId = null, destinationId = null, sentTime = null, dispatchedTime = null) {
        this.origin = origin;
        this.destination = destination;
        this.payload = payload;
        this.originId = originId;
        this.destinationId = destinationId;
        this.comPort = comPort;
        this.sentTime = sentTime;
        this.dispatchedTime = dispatchedTime;
    }
    get string() {
        return JSON.stringify({
            origin: this.origin,
            destination: this.destination,
            payload: this.payload,
            originId: this.originId,
            destinationId: this.destinationId,
            comPort: this.comPort,
            sentTime: this.sentTime,
            dispatchedTime: this.dispatchedTime
        });
    }
    static fromJSON(json) {
        //console.log("Parsing JSON: " + json)
        const { origin, destination, payload, originId, destinationId, comPort, sentTime, dispatchedTime } = JSON.parse(json);
        return new Message(comPort, origin, destination, payload, originId, destinationId, sentTime, dispatchedTime);
    }
}
export class MessageHandler {
    constructor(ns, origin, originId = null) {
        this.origin = origin;
        this.ns = ns;
        this.originId = originId;
        this.messageQueue = [];
        this.messageChannel = Math.ceil(Math.random() * 20);
        //this.messageChannel = CommunicationChannels[Math.floor(Math.random() * CommunicationChannels.length)]
    }
    async sendMessage(destination, payload, destinationId = null) {
        let newMessage = new Message(this.messageChannel, this.origin, destination, payload, this.originId, destinationId);
        newMessage.sentTime = Date.now();
        //console.log("Sending message: " + newMessage.string)
        let ntry = 10;
        for (let i = 0; i < ntry; i++) {
            const messageWritten = await this.ns.tryWritePort(this.messageChannel, newMessage.string);
            if (messageWritten)
                return;
            await this.ns.sleep(100);
        }
        this.ns.print("MESSAGE LOST: " + newMessage.string);
    }
    async clearMyMessage() {
        await this.sendMessage(ChannelName.messageManager, new Payload(Action.clearMyMessage));
    }
    async checkMessage(filter) {
        const payload = filter ? new Payload(Action.messageRequest, filter.toString()) : new Payload(Action.messageRequest);
        await this.sendMessage(ChannelName.messageManager, payload);
        let numberTry = 0;
        while (numberTry < 100) {
            let response = this.ns.peek(this.messageChannel);
            if (response === NULL_PORT_DATA) {
                await this.ns.sleep(100);
                numberTry++;
                continue;
            }
            let parsedMessage = Message.fromJSON(response);
            /////////////////////////
            ////////////////////////
            /// Bug ici
            if (parsedMessage.destination === this.origin && parsedMessage.destinationId === this.originId) {
                // if (this.originId !== null && parsedMessage.destinationId !== this.originId) {
                //     await this.ns.sleep(10)
                //     numberTry++
                //     continue
                // }
                this.ns.readPort(this.messageChannel);
                if (parsedMessage.payload.action === Action.noMessage) {
                    break;
                }
                this.messageQueue.push(parsedMessage);
            }
            await this.ns.sleep(10);
        }
    }
    async popLastMessage() {
        await this.checkMessage();
        const response = this.messageQueue.splice(0, 1);
        if (response) {
            return response;
        }
        return [];
    }
    async getMessagesInQueue(filter) {
        await this.checkMessage(filter);
        let messagesToReturn = filter ? this.messageQueue.filter(filter) : this.messageQueue;
        this.messageQueue = filter ? this.messageQueue.filter(m => !filter(m)) : [];
        return messagesToReturn;
    }
    async waitForAnswer(filter, timeToWait = 10000) {
        const numberOfCycle = Math.floor(timeToWait / 100);
        for (let i = 0; i < numberOfCycle; i++) {
            //while(true) {
            let response = filter ? await this.getMessagesInQueue(filter) : await this.popLastMessage();
            if (response.length > 0) {
                return response;
            }
            await this.ns.sleep(100);
        }
        //this.ns.tprint("Expected message not received!")
        return [];
    }
    async sendAndWait(destination, payload, destinationId = null, retry = false, filter) {
        let numberOfTry = 1;
        if (retry) {
            numberOfTry = 10;
        }
        for (let i = 0; i < numberOfTry; i++) {
            await this.sendMessage(destination, payload, destinationId);
            const response = await this.waitForAnswer(filter);
            if (response.length > 0) {
                return response;
            }
            await this.ns.sleep(100);
        }
        return [];
    }
}
