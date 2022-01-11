import { DEBUG, } from "/Orchestrator/Config/Config";
export async function main(ns) {
    ns.disableLog("sleep");
    ns.disableLog("scp");
    ns.disableLog("scan");
    ns.disableLog("getHackingLevel");
    ns.disableLog("getServerRequiredHackingLevel");
    ns.disableLog("getServerNumPortsRequired");
    ns.disableLog("nuke");
    const currentHost = ns.getHostname();
    const hackedHost = [];
    let checkedHost = [];
    DEBUG && ns.print("Scanning network");
    checkedHost = [];
    await scan_all(currentHost);
    async function scan_all(base_host) {
        let hostArray = ns.scan(base_host);
        for (let i = 0; i < hostArray.length; i++) {
            const host = hostArray[i];
            ns.connect(host);
            if (!checkedHost.includes(host)) {
                checkedHost.push(host);
                if (ns.hasRootAccess(host) && !hackedHost.includes(host)) {
                    await ns.installBackdoor();
                    hackedHost.push(host);
                }
                await scan_all(host);
            }
            ns.connect(base_host);
        }
    }
}
