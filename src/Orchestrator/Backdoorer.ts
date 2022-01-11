/** @param {NS} ns **/
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {
    DEBUG, HACKING_CONDUCTOR,
    HACKING_SCRIPTS, HACKING_SERVER,
    IMPORT_TO_COPY, KILL_MESSAGE, MANAGING_SERVER, PORT_CRACKER,
} from "/Orchestrator/Config/Config";
import {Message, MessageHandler, Payload} from "/Orchestrator/Class/Message";

export async function main(ns) {
    ns.disableLog("sleep");
    ns.disableLog("scp");
    ns.disableLog("scan");
    ns.disableLog("getHackingLevel");
    ns.disableLog("getServerRequiredHackingLevel");
    ns.disableLog("getServerNumPortsRequired");
    ns.disableLog("nuke");

    const currentHost: string = ns.getHostname();
    const hackedHost: string[] = [];
    let checkedHost: string[] = [];

    DEBUG && ns.print("Scanning network")
    checkedHost = []
    await scan_all(currentHost);

    async function scan_all(base_host) {
        let hostArray: string[] = ns.scan(base_host);
        for (let i = 0; i < hostArray.length; i++) {
            const host: string = hostArray[i];
            ns.connect(host)
            if (!checkedHost.includes(host)) {
                checkedHost.push(host);
                if (ns.hasRootAccess(host) && !hackedHost.includes(host)) {
                    await ns.installBackdoor()
                    hackedHost.push(host);
                }
                await scan_all(host);
            }
            ns.connect(base_host)
        }
    }
}