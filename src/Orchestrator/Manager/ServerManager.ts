/** @param {NS} ns **/
import {NS} from "Bitburner";
import {DEBUG, KILL_MESSAGE, SERVER_INITIAL_RAM} from "/Orchestrator/Config/Config";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {Message, MessageHandler, Payload} from "/Orchestrator/Class/Message";

export async function main(ns: NS) {
    ns.disableLog('sleep')
    ns.disableLog('getPurchasedServerLimit')
    ns.disableLog('getPurchasedServers')
    ns.disableLog('getPurchasedServerCost')
    ns.disableLog('getServerMoneyAvailable')
    ns.disableLog('serverExists')
    ns.disableLog('purchaseServer')
    ns.disableLog('deleteServer')
    ns.disableLog('getServerMaxRam')
    ns.disableLog('killall')

    const mySelf: ChannelName = ChannelName.serverManager

    const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)

    let hackPaused: boolean = false
    let everythingMaxed: boolean = false

    while (true) {
        if (everythingMaxed) {
            DEBUG && ns.print("All server maxed out, quitting.")
            break
        }
        if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
            DEBUG && ns.print("Max server not hit")
            while (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(SERVER_INITIAL_RAM) && ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
                const numberOfServer: number = ns.getPurchasedServers().length
                const hostname: string = "pserv-" + numberOfServer
                await buyServer(hostname, SERVER_INITIAL_RAM)
            }
            DEBUG && ns.print("Insufficient funds.")
        }

        if (ns.getPurchasedServers().length == ns.getPurchasedServerLimit()) {
            // Try to upgrade the servers
            DEBUG && ns.print("Max server hit. Upgrading Server")
            await upgradeServer()
        }
        if (hackPaused) {
            DEBUG && ns.print("Resuming.")
            await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackResume))
            hackPaused = false
        }
        for (let i=0; i<60; i++) {
            if (await checkForKill()) return
            await ns.sleep(1000)
        }

    }

    async function checkForKill(): Promise<boolean> {
        const killMessage: Message[] = await messageHandler.getMessagesInQueue(KILL_MESSAGE)
        if (killMessage.length > 0) {
            DEBUG && ns.print("Kill request")
            return true
        }
        return false
    }

    async function upgradeServer() {
        for (let k = 0; k < 10; k++) {
            let serverArray: string[] = ns.getPurchasedServers()
            let smallestRamValue: number = ns.getServerMaxRam(serverArray[1])
            let smallestServers: string[] = []
            // Finding what are the smallest servers
            for (let j = 1; j < serverArray.length; j++) {
                let curServer: string = serverArray[j]
                if (ns.getServerMaxRam(curServer) < smallestRamValue) {
                    smallestServers = []
                    smallestRamValue = ns.getServerMaxRam(curServer)
                }
                if (ns.getServerMaxRam(curServer) == smallestRamValue) {
                    smallestServers.push(curServer)
                }
            }
            DEBUG && ns.print("Smallest servers have " + smallestRamValue + "gb. Count(" + smallestServers.length + ")")
            // Upgrading the server
            let priceCheck = ns.getPurchasedServerCost(smallestRamValue * 2)
            if (!Number.isFinite(priceCheck)) {
                everythingMaxed = true
                return
            }
            for (let i = 0; i < smallestServers.length; i++) {
                DEBUG && ns.print("Trying to update: " + serverArray[i])
                if (ns.getServerMoneyAvailable("home") > priceCheck) {
                    await buyServer(serverArray[i], smallestRamValue * 2)
                } else {
                    DEBUG && ns.print("Not enough money. Requiring " + priceCheck)
                    return
                }
            }
        }
    }

    async function buyServer(hostname: string, ram: number) {
        if (!hackPaused) {
            await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.pause))
            DEBUG && ns.print("Pause requested awaiting answer")
            await messageHandler.waitForAnswer(m => m.payload.action === Action.hackPaused)
            hackPaused = true
        }
        if (ns.serverExists(hostname)) {
            //ns.killall(hostname)
            if(ns.getServerUsedRam(hostname)>0) {
                ns.tprint("SCRIPTS ARE STILL RUNNING")
                return
            }
            ns.deleteServer(hostname)
            DEBUG && ns.print("Deleted server " + hostname)
        }
        let newServer = ns.purchaseServer(hostname, ram)
        DEBUG && ns.print("Bough new server " + newServer + " with " + ram + " gb of ram")
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.updateHost, hostname))
    }
}

