/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Action, ChannelName} from "/Orchestrator/MessageManager/enum";
import {MessageHandler, Payload} from "/Orchestrator/MessageManager/class";

interface IConsoleAction {
    function: () => void,
    help: string
}

export async function main(ns: NS) {

    const allowedAction: Record<string, IConsoleAction> = {
        kill: {
            function: kill,
            help: "Kill the orchestra"
        },
        pause: {
            function: pause,
            help: "This will pause the HackManager, it will let the conductor finish first."
        },
        resume: {
            function: resume,
            help: "Resume the hack manager after a pause."
        },
        help: {
            function: help,
            help: "Print this."
        },
        messageQueue: {
            function: messageQueue,
            help: "See the current message queue, useful for debugging"
        },
        threadsUse: {
            function: threadsUse,
            help: "Show the current status of the Threads Manager."
        },
        printHacks: {
            function: printHacks,
            help: "Print the current hack algorithm calculations."
        },
        printRunningHacks: {
            function: printRunningHacks,
            help: "Print the current running hacks."
        },
        switchHackMode: {
            function: switchHackMode,
            help: "Switch between XP only hacking or Money focused hacking."
        }
    }

    let action: string = ns.args[0] as string
    if (!action) {
        action = "help"
    }

    if (!Object.keys(allowedAction).includes(action)) {
        ns.tprint("Invalid operation")
        action = "help"
    }

    const mySelf: ChannelName = ChannelName.consoleLink
    const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)

    await allowedAction[action].function()

    async function kill() {
        ns.tprint("Killing the orchestra.")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.kill))
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.kill))
        await messageHandler.sendMessage(ChannelName.serverManager, new Payload(Action.kill))
        await messageHandler.sendMessage(ChannelName.targetManager, new Payload(Action.kill))
    }

    async function pause() {
        ns.tprint("Pausing the hack manager.")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.pause))
    }

    async function resume() {
        ns.tprint("Resuming the hack manager.")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackResume))
    }

    async function help() {
        ns.tprint("Usage: run Console.ts [action].")
        for (let i = 0; i < Object.keys(allowedAction).length; i++) {
            const keyName = Object.keys(allowedAction)[i]
            ns.tprint(" - " + keyName + ": " + allowedAction[keyName].help)
        }
    }

    async function messageQueue() {
        ns.tprint("Checking message queue.")
        await messageHandler.sendMessage(ChannelName.messageManager, new Payload(Action.dumpQueue))
    }

    async function threadsUse() {
        ns.tprint("Printing Threads status.")
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.consoleThreadsUse))
    }

    async function printHacks() {
        ns.tprint("Printing Hacks Calculations.")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.printHacks))
    }

    async function printRunningHacks() {
        ns.tprint("Printing Running Hacks.")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.printRunningHacks))
    }

    async function switchHackMode() {
        ns.tprint("Switching hack mode.")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.switchHackMode))
    }
}