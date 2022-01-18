import { Action, Channel, ChannelName } from "/Orchestrator/MessageManager/enum";
export const NULL_PORT_DATA = "NULL PORT DATA";
export class Payload {
    constructor(action, info, extra) {
        this.action = action;
        this.info = info || null;
        this.extra = extra !== undefined ? extra : null;
    }
}
export class Message {
    constructor(origin, destination, payload, originId = null, destinationId = null) {
        this.origin = origin;
        this.destination = destination;
        this.payload = payload;
        this.originId = originId;
        this.destinationId = destinationId;
    }
    get string() {
        return JSON.stringify({
            origin: this.origin,
            destination: this.destination,
            payload: this.payload,
            originId: this.originId,
            destinationId: this.destinationId
        });
    }
    static fromJSON(json) {
        //console.log("Parsing JSON: " + json)
        const { origin, destination, payload, originId, destinationId } = JSON.parse(json);
        return new Message(origin, destination, payload, originId, destinationId);
    }
}
export class MessageHandler {
    constructor(ns, origin, originId = null) {
        this.origin = origin;
        this.ns = ns;
        this.originId = originId;
        this.messageQueue = [];
    }
    async sendMessage(destination, payload, destinationId = null) {
        let newMessage = new Message(this.origin, destination, payload, this.originId, destinationId);
        //console.log("Sending message: " + newMessage.string)
        let messageWritten = false;
        let ntry = 0;
        while (!messageWritten) {
            messageWritten = await this.ns.tryWritePort(Channel.messageManager, newMessage.string);
            await this.ns.sleep(250);
            ntry++;
            if (ntry == 100) {
                this.ns.tprint("MESSAGE LOST: " + newMessage.string);
                break;
            }
        }
    }
    async clearMyMessage() {
        await this.sendMessage(ChannelName.messageManager, new Payload(Action.clearMyMessage));
    }
    async checkMessage(filter) {
        const payload = filter ? new Payload(Action.messageRequest, filter.toString()) : new Payload(Action.messageRequest);
        await this.sendMessage(ChannelName.messageManager, payload);
        while (true) {
            let response = this.ns.peek(Channel[this.origin]);
            if (response === NULL_PORT_DATA) {
                await this.ns.sleep(10);
                continue;
            }
            let parsedMessage = Message.fromJSON(response);
            if (this.originId !== null && parsedMessage.destinationId !== this.originId) {
                await this.ns.sleep(10);
                continue;
            }
            this.ns.readPort(Channel[this.origin]);
            if (parsedMessage.payload.action === Action.noMessage) {
                break;
            }
            this.messageQueue.push(parsedMessage);
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
    async waitForAnswer(filter) {
        while (true) {
            let response = filter ? await this.getMessagesInQueue(filter) : await this.popLastMessage();
            if (response.length > 0) {
                return response;
            }
            await this.ns.sleep(100);
        }
    }
}
