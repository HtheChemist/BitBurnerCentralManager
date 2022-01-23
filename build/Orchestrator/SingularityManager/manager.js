/** @param {NS} ns **/
import { ChannelName } from "/Orchestrator/MessageManager/enum";
import { DEBUG } from "/Orchestrator/Config/Config";
import { MessageHandler } from "/Orchestrator/MessageManager/class";
import { formatMoney } from "/Orchestrator/Common/GenericFunctions";
import { COMMIT_CRIME, PROGRAMS } from "/Orchestrator/Config/Singularity";
export async function main(ns) {
    ns.disableLog("sleep");
    ns.disableLog("scp");
    ns.disableLog("scan");
    ns.disableLog("getHackingLevel");
    ns.disableLog("getServerRequiredHackingLevel");
    ns.disableLog("getServerNumPortsRequired");
    ns.disableLog("nuke");
    ns.disableLog("ALL");
    const mySelf = ChannelName.targetManager;
    const messageHandler = new MessageHandler(ns, mySelf);
    const currentHost = ns.getHostname();
    const backdooredHost = [];
    const stuffBough = [];
    let checkedHost = [];
    while (true) {
        DEBUG && ns.print("Scanning network");
        checkedHost = [];
        await scanAll(currentHost);
        DEBUG && ns.print("Finshing scan. Waiting for next cycle.");
        await buyStuff();
        for (let i = 0; i < 60 * 4; i++) {
            if (COMMIT_CRIME) {
                await commitCrime();
            }
            //if (await checkForKill(ns, messageHandler)) return
            await ns.sleep(250);
        }
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
                        ns.purchaseProgram(program.name);
                    }
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
                if (!backdooredHost.includes(host)) {
                    await ns.installBackdoor(host);
                    ns.print("Backdoored: " + host);
                    backdooredHost.push(host);
                }
                await ns.sleep(100);
                await scanAll(host);
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
