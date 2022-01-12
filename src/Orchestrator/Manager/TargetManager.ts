/** @param {NS} ns **/
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {
    DEBUG, HACKING_CONDUCTOR,
    HACKING_SCRIPTS, HACKING_SERVER,
    IMPORT_TO_COPY, KILL_MESSAGE, MANAGING_SERVER, PORT_CRACKER,
} from "/Orchestrator/Config/Config";
import {Message, MessageActions, MessageHandler, Payload} from "/Orchestrator/Class/Message";
import {copyFile} from "/Orchestrator/Common/GenericFunctions";

export async function main(ns) {
    ns.disableLog("sleep");
    ns.disableLog("scp");
    ns.disableLog("scan");
    ns.disableLog("getHackingLevel");
    ns.disableLog("getServerRequiredHackingLevel");
    ns.disableLog("getServerNumPortsRequired");
    ns.disableLog("nuke");

    const mySelf: ChannelName = ChannelName.targetManager;
    const messageHandler = new MessageHandler(ns, mySelf);


    const portOpener: ((h: string) => void)[] = [];
    for (let i = 0; i < PORT_CRACKER.length; i++) {
        if (ns.fileExists(PORT_CRACKER[i].file)) {
            portOpener.push(ns[PORT_CRACKER[i].function]);
        }
    }

    const currentHost: string = ns.getHostname();
    const hackedHost: string[] = [];
    let checkedHost: string[] = [];

    while (true) {
        DEBUG && ns.print("Scanning network")
        checkedHost = []
        await scan_all(currentHost);
        for (let i = 0; i < 60; i++) {
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

    async function scan_all(base_host) {
        let hostArray: string[] = ns.scan(base_host);
        for (let i = 0; i < hostArray.length; i++) {
            const host: string = hostArray[i];
            if (!checkedHost.includes(host)) {
                checkedHost.push(host);
                if (checkHost(host) && !hackedHost.includes(host)) {
                    DEBUG && ns.print("Found new host: " + host);
                    // We ns.rm before since there seems to be a bug with cached import: https://github.com/danielyxie/bitburner/issues/2413
                    if (host !== "home" && host !== HACKING_SERVER && host !== MANAGING_SERVER) {
                        await prepareServer(host)
                    }

                    hackedHost.push(host);
                    await broadcastNewHost(host);
                }
                await ns.sleep(100)
                await scan_all(host);
            }
        }
    }

    function checkHost(host: string): boolean {
        if (ns.hasRootAccess(host)) {
            // Already root
            return true;
        }
        if (ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(host)) {
            const requiredPort: number = ns.getServerNumPortsRequired(host);
            if (requiredPort <= portOpener.length) {
                // We have enough port cracker
                let portOpen = 0;
                while (portOpen < requiredPort) {
                    portOpener[portOpen](host);
                    portOpen++;
                }
            } else {
                // Not enough port cracker
                return false;
            }
            // Can be hacked
            ns.nuke(host);
            return true;
        } else {
            // Not enough hacking level
            return false;
        }
    }

    async function broadcastNewHost(host) {
        DEBUG && ns.print("Broadcasting host: " + host);
        const payload = new Payload(Action.addHost, host);
        DEBUG && ns.print("Broadcasting to Thread Manager");
        await messageHandler.sendMessage(ChannelName.threadManager, payload);
        DEBUG && ns.print("Broadcasting to Hack Manager");
        await messageHandler.sendMessage(ChannelName.hackManager, payload);
    }

    async function prepareServer(host) {
        await copyFile(ns, Object.values(HACKING_SCRIPTS), host)
        await copyFile(ns, IMPORT_TO_COPY, host)
    }
}


