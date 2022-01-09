/** @param {NS} ns **/
import { Message, Payload } from "/Orchestrator/Class/Message";
import { Action, Channel, ChannelName } from "/Orchestrator/Enum/MessageEnum";
export async function main(ns) {
    ns.disableLog('sleep');
    let messageQueue = [];
    while (true) {
        receiveMessage();
        await checkMessageRequest();
        await ns.sleep(10);
    }
    function extractMessage(filter) {
        const extractedMessage = messageQueue.filter(filter);
        messageQueue = messageQueue.filter(m => !filter(m));
        return extractedMessage;
    }
    async function checkMessageRequest() {
        const requests = extractMessage(m => m.payload.action === Action.messageRequest);
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            const requesterFilter = (m) => (m.destination === request.origin && m.destinationId === request.originId);
            let extraFilter = (m) => true;
            if (request.payload.info) {
                extraFilter = eval(request.payload.info);
            }
            const messageForRequester = extractMessage(requesterFilter);
            const messageToSend = messageForRequester.filter(extraFilter);
            const messageToKeep = messageForRequester.filter(m => !extraFilter(m));
            messageQueue.push(...messageToKeep);
            if (messageToSend.length > 0) {
                await sendMessage(messageToSend);
            }
            else {
                await sendMessage([new Message(ChannelName.messageManager, request.origin, new Payload(Action.noMessage), request.originId)]);
            }
        }
    }
    async function sendMessage(messageToSend) {
        for (let i = 0; i < messageToSend.length; i++) {
            const writtenMessage = await ns.tryWritePort(Channel[messageToSend[i].destination], messageToSend[i].string);
            if (!writtenMessage) {
                messageQueue.push(messageToSend[i]);
            }
        }
    }
    function receiveMessage() {
        const response = ns.readPort(Channel.messageManager);
        if (response != "NULL PORT DATA") {
            let parsedResponse = Message.fromJSON(response);
            messageQueue.push(parsedResponse);
        }
    }
}
