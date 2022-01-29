/** @param {NS} ns **/
import { ChannelName } from "/Orchestrator/MessageManager/enum";
import { MessageHandler } from "/Orchestrator/MessageManager/class";
import { formatMoney } from "/Orchestrator/Common/GenericFunctions";
import { COMMIT_CRIME, PROGRAMS } from "/Orchestrator/Config/Singularity";
import { dprint } from "/Orchestrator/Common/Dprint";
export async function main(ns) {
    ns.disableLog("sleep");
    ns.disableLog("scp");
    ns.disableLog("scan");
    ns.disableLog("getHackingLevel");
    ns.disableLog("getServerRequiredHackingLevel");
    ns.disableLog("getServerNumPortsRequired");
    ns.disableLog("nuke");
    const mySelf = ChannelName.targetManager;
    const messageHandler = new MessageHandler(ns, mySelf);
    const currentHost = ns.getHostname();
    const backdooredHost = [];
    const stuffBough = [];
    let buyStuffSwitch = true;
    checkAlreadyBought();
    let checkedHost = [];
    while (true) {
        dprint(ns, "Scanning network");
        checkedHost = [];
        await scanAll(currentHost);
        ns.connect("home");
        dprint(ns, "Finshing scan. Waiting for next cycle.");
        buyStuffSwitch && await buyStuff();
        for (let i = 0; i < 4; i++) {
            ns.tprint(COMMIT_CRIME);
            if (COMMIT_CRIME) {
                ns.tprint("Criming!");
                await commitCrime();
            }
            //if (await checkForKill(ns, messageHandler)) return
            await ns.sleep(250);
        }
        ns.tprint("Pausing crime for 10 seconds, now it is time to kill the script.");
        await ns.sleep(10 * 1000);
    }
    function checkAlreadyBought() {
        if (ns.scan("home").includes("darkweb"))
            stuffBough.push("tor");
        for (const program of PROGRAMS) {
            if (ns.fileExists(program.name, "home"))
                stuffBough.push(program.name);
        }
        if (stuffBough.length === PROGRAMS.length + 1)
            buyStuffSwitch = false;
    }
    async function buyStuff() {
        for (const program of PROGRAMS) {
            if ((stuffBough.includes("tor") || program.name === "tor") && !stuffBough.includes(program.name)) {
                const moneyAvailable = ns.getServerMoneyAvailable("home");
                if (program.price <= moneyAvailable) {
                    if (program.name === "tor") {
                        ns.purchaseTor();
                    }
                    else {
                        !ns.fileExists(program.name, "home") && ns.purchaseProgram(program.name);
                    }
                    dprint(ns, "Bought: " + program.name);
                    stuffBough.push(program.name);
                }
            }
        }
    }
    async function scanAll(base_host) {
        let hostArray = ns.scan(base_host);
        for (const host of hostArray) {
            if (!checkedHost.includes(host) && !host.includes("pserv-")) {
                checkedHost.push(host);
                ns.connect(host);
                if (!backdooredHost.includes(host) && ns.hasRootAccess(host)) {
                    await ns.installBackdoor();
                    ns.print("Backdoored: " + host);
                    backdooredHost.push(host);
                }
                await ns.sleep(100);
                await scanAll(host);
                ns.connect(base_host);
            }
        }
    }
    // From https://steamlists.com/bitburner-crime-script-code-odds-of-success-requirements/
    async function commitCrime() {
        const crimes = [
            "heist",
            "assassination",
            "kidnap",
            "grand theft auto",
            "homicide",
            "larceny",
            "mug someone",
            "rob store",
            "shoplift",
        ];
        if (ns.isBusy())
            return;
        // Calculate the risk value of all crimes
        const choices = crimes.map((crime) => {
            const crimeStats = ns.getCrimeStats(crime); // Let us look at the important bits
            const crimeChance = ns.getCrimeChance(crime); // We need to calculate if its worth it
            /** Using probabilty(odds) to calculate the "risk" to get the best reward
             * Risk Value = Money Earned * Odds of Success(P(A) / ~P(A)) / Time taken
             *
             * Larger risk values indicate a better choice
             */
            const crimeValue = (crimeStats.money * Math.log10(crimeChance / (1 - crimeChance + Number.EPSILON))) /
                crimeStats.time;
            return { crime: crime, relativeValue: crimeValue, stats: crimeStats };
        });
        choices.sort(choiceSorter);
        ns.commitCrime(choices[0].crime);
        ns.print("Crime: " + choices[0].crime + " (RV: " + choices[0].relativeValue.toPrecision(3) + "): " + formatMoney(choices[0].stats.money));
    }
}
export const choiceSorter = (a, b) => {
    if (a.relativeValue < b.relativeValue) {
        return 1;
    }
    if (a.relativeValue > b.relativeValue) {
        return -1;
    }
    return 0;
};
