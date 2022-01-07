/** @param {NS} ns **/

import {NS} from "Bitburner";
import {Message} from "/Orchestrator/Class/Message";
import {Channel} from "/Orchestrator/Enum/MessageEnum";

export async function main(ns: NS) {
    ns.disableLog('sleep')

    let messageQueue: Message[] = [];
    while (true) {
        receiveMessage();
        await sendMessage();
        await ns.sleep(100);
    }

    async function sendMessage() {
        const newQueue: Message[] = [];
        for (let i = 0; i < messageQueue.length; i++) {
            const writtenMessage = await ns.tryWritePort(
                Channel[messageQueue[i].destination],
                messageQueue[i].string
            );
            console.log("Send message to destination: " + messageQueue[i].string)
            if (!writtenMessage) {
                newQueue.push(messageQueue[i]);
            }
        }
        messageQueue = newQueue;
    }

    function receiveMessage() {
        const response = ns.readPort(Channel.messageManager);
        if (response != "NULL PORT DATA") {
            console.log("Manager received message: " + response)
            let parsedResponse: Message = Message.fromJSON(response);
            console.log("Parsed message to: " + parsedResponse.string)
            messageQueue.push(parsedResponse);
        }
    }
}
