import { HACKING_SCRIPTS, IMPORT_TO_COPY, KILL_MESSAGE, MAX_SERVER_RAM, MIN_SERVER_FOR_UPDATE, SERVER_INITIAL_RAM } from "/Orchestrator/Config/Config";
import { Action, ChannelName } from "/Orchestrator/MessageManager/enum";
import { MessageHandler, Payload } from "/Orchestrator/MessageManager/class";
import { copyFile } from "/Orchestrator/Common/GenericFunctions";
import { dprint } from "/Orchestrator/Common/Dprint";
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('getPurchasedServerLimit');
    ns.disableLog('getPurchasedServers');
    ns.disableLog('getPurchasedServerCost');
    ns.disableLog('getServerMoneyAvailable');
    ns.disableLog('serverExists');
    ns.disableLog('purchaseServer');
    ns.disableLog('deleteServer');
    ns.disableLog('getServerMaxRam');
    ns.disableLog('killall');
    ns.disableLog('scp');
    const mySelf = ChannelName.serverManager;
    const messageHandler = new MessageHandler(ns, mySelf);
    let hackPaused = false;
    let everythingMaxed = false;
    let taggedForUpdate = [];
    while (true) {
        if (everythingMaxed) {
            dprint(ns, "All server maxed out, quitting.");
            break;
        }
        if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
            dprint(ns, "Max server not hit");
            while (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(SERVER_INITIAL_RAM) && ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
                const numberOfServer = ns.getPurchasedServers().length;
                const hostname = "pserv-" + numberOfServer;
                await buyServer(hostname, SERVER_INITIAL_RAM);
            }
            dprint(ns, "Insufficient funds.");
        }
        if (ns.getPurchasedServers().length == ns.getPurchasedServerLimit()) {
            // Try to upgrade the servers
            dprint(ns, "Max server hit. Upgrading Server");
            await upgradeServer();
        }
        // if (hackPaused) {
        //     dprint(ns, "Resuming.")
        //     await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackResume))
        //     hackPaused = false
        // }
        for (let i = 0; i < 60; i++) {
            //if (await checkForKill()) return
            await ns.sleep(1000);
        }
    }
    async function checkForKill() {
        const killMessage = await messageHandler.getMessagesInQueue(KILL_MESSAGE);
        if (killMessage.length > 0) {
            dprint(ns, "Kill request");
            return true;
        }
        return false;
    }
    async function upgradeServer() {
        let serverArray = ns.getPurchasedServers();
        let smallestRamValue = ns.getServerMaxRam(serverArray[1]);
        let smallestServers = [];
        // Finding what are the smallest servers
        for (let j = 1; j < serverArray.length; j++) {
            let curServer = serverArray[j];
            if (ns.getServerMaxRam(curServer) < smallestRamValue) {
                smallestServers = [];
                smallestRamValue = ns.getServerMaxRam(curServer);
            }
            if (ns.getServerMaxRam(curServer) == smallestRamValue) {
                smallestServers.push(curServer);
            }
        }
        dprint(ns, "Smallest servers have " + smallestRamValue + "gb. Count(" + smallestServers.length + ")");
        // Upgrading the server
        let priceCheck = ns.getPurchasedServerCost(smallestRamValue * 2);
        if (!Number.isFinite(priceCheck) || (smallestRamValue >= MAX_SERVER_RAM && MAX_SERVER_RAM !== -1)) {
            everythingMaxed = true;
            return;
        }
        if (ns.getServerMoneyAvailable("home") >= Math.min(priceCheck * MIN_SERVER_FOR_UPDATE, priceCheck * smallestServers.length)) {
            for (let i = 0; i < smallestServers.length; i++) {
                dprint(ns, "Trying to update: " + serverArray[i]);
                if (ns.getServerMoneyAvailable("home") > priceCheck) {
                    await buyServer(serverArray[i], smallestRamValue * 2);
                }
                else {
                    dprint(ns, "Not enough money. Requiring " + priceCheck);
                    return;
                }
            }
        }
        else {
            dprint(ns, "Not enough money to upgrade the minimum amount of server. ");
            return;
        }
    }
    async function buyServer(hostname, ram) {
        // Note: No need to ask for pause if we go through the thread lock method
        // if (!hackPaused) {
        //     await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.pause))
        //     dprint(ns, "Pause requested awaiting answer")
        //     await messageHandler.waitForAnswer(m => m.payload.action === Action.hackPaused)
        //     hackPaused = true
        // }
        const moneyAvailable = ns.getServerMoneyAvailable("home");
        const cost = ns.getPurchasedServerCost(ram);
        if (ns.serverExists(hostname)) {
            // Note: this kind of structure may cause a long delay since some threads can take a while to free
            // it is therefore blocking. We could possibly implement a non blocking method
            if (ns.getServerUsedRam(hostname) > 0) {
                await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.lockHost, hostname));
                ns.print("Waiting for server to empty.");
                while (true) {
                    const response = await messageHandler.waitForAnswer((m) => true, 10 * 60 * 1000);
                    if (response.length > 0) {
                        break;
                    }
                    await ns.sleep(1000);
                }
            }
            if (ns.getServerUsedRam(hostname) > 0) {
                ns.print("Script are still running.");
                return;
            }
            if (moneyAvailable > cost) {
                ns.deleteServer(hostname);
                dprint(ns, "Deleted server " + hostname);
            }
        }
        if (moneyAvailable > cost) {
            let newServer = ns.purchaseServer(hostname, ram);
            await copyFile(ns, Object.values(HACKING_SCRIPTS), newServer);
            await copyFile(ns, IMPORT_TO_COPY, newServer);
            dprint(ns, "Bough new server " + newServer + " with " + ram + " gb of ram");
            await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.updateHost, hostname));
        }
    }
}
