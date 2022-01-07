/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {MessageHandler, Payload} from "/Orchestrator/Class/Message";

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
    }

    let action: string = ns.args[0] as string
    if (!action) {
        action = "help"
    }
    if(!Object.keys(allowedAction).includes(action)) {
        ns.tprint("Invalid operation")
    }

    const mySelf: ChannelName = ChannelName.consoleLink
    const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)

    await allowedAction[action].function()

    async function kill() {
        ns.tprint("Killing the orchestra.")
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.kill))
    }

    async function pause() {
        ns.tprint("Pausing the hack manager.")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.pause))
    }

    async function resume() {
        ns.tprint("Resuming the hack manager.")
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.resume))
    }

    async function help() {
        ns.tprint("Usage: run Console.ts [action]: ")
        for(let i=0;i<Object.keys(allowedAction).length;i++){
            const keyName = Object.keys(allowedAction)[i]
            ns.tprint(" - " + keyName + ": " + allowedAction[keyName].help)
        }
    }
}