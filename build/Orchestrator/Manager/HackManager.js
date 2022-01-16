import { MessageHandler, Payload, } from "/Orchestrator/Class/Message";
import { DEBUG, DEFAULT_HACKING_MODE, HACK_MODE, HACKING_CONDUCTOR, HACKING_SERVER, } from "/Orchestrator/Config/Config";
import { HackedHost, hackSorter } from "/Orchestrator/Class/Hack";
import { GrowWeakenAlgorithm } from "/Orchestrator/HackAlgorithm/GrowWeakenAlgorithm";
import { Action, ChannelName } from "/Orchestrator/Enum/MessageEnum";
import { HackType } from "/Orchestrator/Enum/HackEnum";
import { XPHackAlgorithm } from "/Orchestrator/HackAlgorithm/XpHackAlgorithm";
import { MoneyHackAlgorithm } from "/Orchestrator/HackAlgorithm/MoneyHackAlgorithm";
const HackAlgorithm = {
    [HackType.growWeakenHack]: GrowWeakenAlgorithm,
    [HackType.moneyHack]: MoneyHackAlgorithm,
    [HackType.xpHack]: XPHackAlgorithm,
};
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('exec');
    ns.disableLog('getHackTime');
    ns.disableLog('getServerGrowth');
    ns.disableLog('getServerMinSecurityLevel');
    ns.disableLog('getServerSecurityLevel');
    ns.disableLog('getServerMaxMoney');
    ns.disableLog('getServerMoneyAvailable');
    ns.disableLog('getServerMaxRam');
    ns.disableLog('getServerRequiredHackingLevel');
    ns.disableLog('getServerUsedRam');
    ns.disableLog('getHackingLevel');
    const mySelf = ChannelName.hackManager;
    const messageHandler = new MessageHandler(ns, mySelf);
    const messageActions = {
        [Action.hackDone]: hackDone,
        [Action.addHost]: addHost,
        [Action.pause]: requestPause,
        [Action.kill]: kill
    };
    const messageFilter = message => [Action.hackDone, Action.addHost, Action.pause, Action.kill].includes(message.payload.action);
    const hackedHost = [];
    let currentHackMode = DEFAULT_HACKING_MODE;
    let currentHackId = 1;
    let currentHack = [];
    let pauseRequested = false;
    let killRequested = false;
    while (true) {
        // This is a .5 second "sleep"
        for (let i = 0; i < 5; i++) {
            let response = await messageHandler.getMessagesInQueue(messageFilter);
            if (response.length > 0) {
                for (let j = 0; j < response.length; j++) {
                    await messageActions[response[j].payload.action]?.(response[j]);
                }
            }
            await ns.sleep(100);
        }
        if (!pauseRequested) {
            await pickHack();
        }
        if (currentHack.length === 0 && pauseRequested) {
            DEBUG && ns.print("Manager paused");
            await messageHandler.sendMessage(ChannelName.serverManager, new Payload(Action.hackPaused));
            await messageHandler.waitForAnswer(m => m.payload.action === Action.hackResume);
            pauseRequested = false;
            DEBUG && ns.print("Manager resumed");
        }
        if (currentHack.length < 1 && killRequested) {
            DEBUG && ns.print("Manager kill");
            return;
        }
    }
    async function hackDone(message) {
        const hack = currentHack.find(h => h.id == message.originId);
        if (hack) {
            DEBUG && ns.print("Hack " + hack.id + " on " + hack.host + " finished: " + message.payload.info);
            currentHack = currentHack.filter(h => h.id !== message.originId);
        }
        else {
            DEBUG && ns.print("Finished hack cannot be found!");
        }
    }
    async function addHost(message) {
        let host = message.payload.info;
        DEBUG && ns.print("Received new host: " + host);
        hackedHost.push(new HackedHost(ns, host));
    }
    function enoughRam(hackType) {
        return (ns.getServerMaxRam(HACKING_SERVER) - ns.getServerUsedRam(HACKING_SERVER) - ns.getScriptRam(HACKING_CONDUCTOR[hackType], HACKING_SERVER)) > 0;
    }
    async function pickHack() {
        DEBUG && ns.print("Picking a hack");
        while (true) {
            const availableThreads = await getAvailableThreads();
            let hackSentSuccess = false;
            if (availableThreads <= 0) {
                DEBUG && ns.print("No threads available");
                break;
            }
            let potentialHack = [];
            for (const hackType of HACK_MODE[currentHackMode]) {
                potentialHack.push(...HackAlgorithm[hackType](ns, currentHack, hackedHost, availableThreads));
            }
            potentialHack.sort(hackSorter);
            // XP Hack is used as a buffer so we append it
            //potentialHack.push(...HackAlgorithm.xpHack(ns, currentHack, hackedHost))
            //for (let i = 0; i < potentialHack.length; i++) {
            for (const topHack of potentialHack) {
                if (!enoughRam(topHack.hackType))
                    continue;
                if (currentHack.filter(h => h.host === topHack.host).length > 0)
                    continue;
                const neededThreads = topHack.hackThreads + topHack.growThreads + topHack.weakenThreads;
                //DEBUG && ns.print("Hack " + topHack.hackType + " on " + topHack.host + " require " + neededThreads)
                // If the hack can be done with less than the ideal number of threads (such as weaken/grow) we only fire it if there is at least 50% available
                if (neededThreads <= availableThreads * 0.5) { //} || (HACK_TYPE_PARTIAL_THREAD.includes(topHack.hackType) && availableThreads <= neededThreads*0.5)) {
                    // Start the hack
                    if (await startHack(topHack)) {
                        hackSentSuccess = true;
                        break;
                    }
                }
            }
            if (!hackSentSuccess) {
                break;
            }
        }
        if (currentHack.length < 1) {
            DEBUG && ns.print("No hack successfully started");
        }
    }
    async function getAvailableThreads() {
        // Get available threads amount
        const messageFilter = m => m.payload.action === Action.threadsAvailable;
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.getThreadsAvailable));
        const response = await messageHandler.waitForAnswer(messageFilter);
        DEBUG && ns.print("Getting available threads: " + response[0].payload.info);
        return response[0].payload.info;
    }
    async function startHack(hack) {
        DEBUG && ns.print("Sending " + hack.hackType + " hack to " + hack.host + " with a relative value of " + hack.relativeValue);
        let executed = 0;
        currentHackId++;
        hack.id = currentHackId;
        for (let i = 0; i < 50; i++) {
            executed = ns.exec(HACKING_CONDUCTOR[hack.hackType], HACKING_SERVER, 1, JSON.stringify(hack), currentHackId);
            if (executed > 0) {
                break;
            }
            await ns.sleep(10);
        }
        if (executed === 0) {
            DEBUG && ns.print("Unable to start hack");
            return false;
        }
        // Awaiting hack to start before continuing, could probably be skipped when everything is more stable
        let messageFilter = (m) => m.payload.action === Action.hackReady;
        const response = await messageHandler.waitForAnswer(messageFilter);
        if (response[0].payload.info === -1) {
            DEBUG && ns.print("Unable to start hack, lack of threads");
            return false;
        }
        currentHack.push(hack);
        return true;
    }
    async function requestPause(message) {
        DEBUG && ns.print("Pause requested");
        pauseRequested = true;
        //for(let j=0; j<currentHack.length; j++) {
        //	await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.stop), currentHack[j].id)
        //}
    }
    async function kill(message) {
        DEBUG && ns.print("Kill requested");
        pauseRequested = true;
        killRequested = true;
        for (let j = 0; j < currentHack.length; j++) {
            await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.kill), currentHack[j].id);
        }
    }
}
