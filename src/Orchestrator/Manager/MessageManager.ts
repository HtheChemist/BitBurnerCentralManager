/** @param {NS} ns **/

import {NS} from "Bitburner";
import {Message, Payload} from "/Orchestrator/Class/Message";
import {Action, Channel, ChannelName} from "/Orchestrator/Enum/MessageEnum";

export async function main(ns: NS) {
    ns.disableLog('sleep')

    let messageQueue: Message[] = [];
    while (true) {
        receiveMessage();
        await checkMessageRequest();
        await ns.sleep(10);
    }

    function extractMessage(filter: (m) => boolean): Message[] {
        const extractedMessage: Message[] = messageQueue.filter(filter)
        messageQueue = messageQueue.filter(m=>!filter(m))
        return extractedMessage
    }

    async function checkMessageRequest() {
        const requests: Message[] = extractMessage(m => m.payload.action === Action.messageRequest)
        for (let i=0; i<requests.length; i++) {
            const request: Message = requests[i]
            const requesterFilter: (m: Message) => boolean = (m) => (m.destination === request.origin && m.destinationId === request.originId)
            let extraFilter: (m: Message) => boolean = (m) => true
            if (request.payload.info) {
                extraFilter = eval(request.payload.info as string)
            }
            const messageForRequester: Message[] = extractMessage(requesterFilter)
            const messageToSend: Message[] = messageForRequester.filter(extraFilter)
            const messageToKeep: Message[] = messageForRequester.filter(m=>!extraFilter(m))
            messageQueue.push(...messageToKeep)
            if (messageToSend.length>0) {
                await sendMessage(messageToSend)
            } else {
                await sendMessage([new Message(ChannelName.messageManager, request.origin, new Payload(Action.noMessage), request.originId)])
            }
        }
    }

    async function sendMessage(messageToSend: Message[]) {
        for (let i = 0; i < messageToSend.length; i++) {
            const writtenMessage = await ns.tryWritePort(
                Channel[messageToSend[i].destination],
                messageToSend[i].string
            );
            if (!writtenMessage) {
                messageQueue.push(messageToSend[i])
            }
        }
    }

    function receiveMessage() {
        const response = ns.readPort(Channel.messageManager);
        if (response != "NULL PORT DATA") {
            let parsedResponse: Message = Message.fromJSON(response);
            messageQueue.push(parsedResponse);
        }
    }
}
