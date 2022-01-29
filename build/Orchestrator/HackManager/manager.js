import { MessageHandler, Payload, } from "/Orchestrator/MessageManager/class";
import { DEFAULT_HACKING_MODE, HACK_MODE, HACKING_CONDUCTOR, HACKING_SERVER, } from "/Orchestrator/Config/Config";
import { HackedHost, hackSorter } from "/Orchestrator/HackManager/hack";
import { GrowWeakenAlgorithm } from "/Orchestrator/HackManager/algorithm/GrowWeakenAlgorithm";
import { Action, ChannelName } from "/Orchestrator/MessageManager/enum";
import { HackMode, HackType } from "/Orchestrator/HackManager/enum";
import { XPHackAlgorithm } from "/Orchestrator/HackManager/algorithm/XpHackAlgorithm";
import { MoneyHackAlgorithm } from "/Orchestrator/HackManager/algorithm/MoneyHackAlgorithm";
import { dprint } from "/Orchestrator/Common/Dprint";
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
        [Action.kill]: kill,
        [Action.printHacks]: printHacks,
        [Action.printRunningHacks]: printRunningHacks,
        [Action.switchHackMode]: switchHackRequest
    };
    //const messageFilter = message => [Action.hackDone, Action.addHost, Action.pause, Action.kill, Action.printHacks, Action.printRunningHacks].includes(message.payload.action)
    const hackedHost = [];
    let currentHackMode = DEFAULT_HACKING_MODE;
    let currentHackId = 1;
    let currentHack = [];
    let pauseRequested = false;
    let killRequested = false;
    let switchRequested = false;
    while (true) {
        // This is a 1 second "sleep"
        for (let i = 0; i < 10; i++) {
            let responses = await messageHandler.getMessagesInQueue();
            if (responses.length > 0) {
                for (const response of responses) {
                    await messageActions[response.payload.action]?.(response);
                }
            }
            await ns.sleep(100);
        }
        if (!pauseRequested && !(currentHackMode === HackMode.xp && currentHack.length > 1)) {
            await pickHack();
        }
        // if (currentHack.length === 0 && pauseRequested) {
        //     dprint(ns, "Manager paused")
        //     await messageHandler.sendMessage(ChannelName.serverManager, new Payload(Action.hackPaused))
        //     await messageHandler.waitForAnswer(m => m.payload.action === Action.hackResume)
        //     pauseRequested = false
        //     dprint(ns, "Manager resumed")
        // }
        if (currentHack.length === 0 && switchRequested) {
            switchHackMode();
        }
        if (currentHack.length < 1 && killRequested) {
            dprint(ns, "Manager kill");
            return;
        }
        //await cleanup()
        await ns.sleep(100);
    }
    async function cleanup() {
        for (const hack of currentHack) {
            const maxTime = Math.max(hack.hackTime, hack.weakenTime, hack.growTime);
            const startTime = hack.startTime || 0;
            if (startTime + maxTime * 1.5 < Date.now()) {
                dprint(ns, "Orphan hack detected, killing hack id: " + hack.id);
                ns.kill(hack.pid);
            }
        }
    }
    async function switchHackRequest(message) {
        switchRequested = true;
        await requestPause();
    }
    function switchHackMode() {
        currentHackMode === HackMode.money ? currentHackMode = HackMode.xp : currentHackMode = HackMode.money;
        dprint(ns, "Hack switching hacking mode to " + currentHackMode);
        pauseRequested = false;
        switchRequested = false;
    }
    async function printHacks(message) {
        const availableThreads = await getAvailableThreads();
        if (availableThreads <= 0) {
            ns.tprint("No threads available, no hacks available.");
            return;
        }
        let potentialHack = [];
        for (const hackType of HACK_MODE[currentHackMode]) {
            potentialHack.push(...HackAlgorithm[hackType](ns, currentHack, hackedHost, availableThreads));
        }
        potentialHack.sort(hackSorter);
        if (potentialHack.length === 0) {
            ns.tprint("No hack available.");
        }
        let id = 0;
        for (let hack of potentialHack) {
            ns.tprint("Hack number " + id + ": ");
            ns.tprint(" - Target: " + hack.host);
            ns.tprint(" - Relative Value: " + hack.relativeValue);
            ns.tprint(" - Hack Type: " + hack.hackType);
            ns.tprint(" - Hack Threads: " + hack.hackThreads);
            ns.tprint(" - Weaken Threads: " + hack.weakenThreads);
            ns.tprint(" - Grow Threads: " + hack.growThreads);
            id++;
        }
        ns.tprint("Calculated hack total: " + potentialHack.length);
    }
    async function printRunningHacks(message) {
        if (currentHack.length === 0) {
            ns.tprint("No hack currently running.");
        }
        for (let hack of currentHack) {
            ns.tprint("Hack number " + hack.id + ": ");
            ns.tprint(" - Target: " + hack.host);
            ns.tprint(" - Relative Value: " + hack.relativeValue);
            ns.tprint(" - Hack Type: " + hack.hackType);
            ns.tprint(" - Hack Threads: " + hack.hackThreads);
            ns.tprint(" - Weaken Threads: " + hack.weakenThreads);
            ns.tprint(" - Grow Threads: " + hack.growThreads);
        }
        ns.tprint("Running hacks: " + currentHack.length);
    }
    async function hackDone(message) {
        const hack = currentHack.find(h => h.id == message.originId);
        if (hack) {
            dprint(ns, "<= " + hack.hackType + " " + hack.id + " from " + hack.host + ": " + message.payload.info);
            currentHack = currentHack.filter(h => h.id !== message.originId);
        }
        else {
            dprint(ns, "Finished hack cannot be found!");
        }
    }
    async function addHost(message) {
        let host = message.payload.info;
        dprint(ns, "Received new host: " + host);
        hackedHost.push(new HackedHost(ns, host));
    }
    function enoughRam(hackType) {
        return (ns.getServerMaxRam(HACKING_SERVER) - ns.getServerUsedRam(HACKING_SERVER) - ns.getScriptRam(HACKING_CONDUCTOR[hackType], HACKING_SERVER)) > 0;
    }
    async function pickHack() {
        dprint(ns, "Sending hacks.");
        //while (true) {
        // We limit to 50 iteration before returning to the main loop, with a high thread count, we may get stuck
        // where the hack finish too fast and it eventually clog up the queue
        for (let i = 0; i < 50; i++) {
            const availableThreads = await getAvailableThreads();
            let hackSentSuccess = false;
            if (availableThreads <= 0) {
                //dprint(ns, "No threads available")
                break;
            }
            let potentialHack = [];
            for (const hackType of HACK_MODE[currentHackMode]) {
                potentialHack.push(...HackAlgorithm[hackType](ns, currentHack, hackedHost, availableThreads));
            }
            potentialHack.sort(hackSorter);
            for (const topHack of potentialHack) {
                if (!enoughRam(topHack.hackType))
                    continue;
                if (currentHack.filter(h => h.host === topHack.host).length > 0)
                    continue;
                // Start the hack
                if (await startHack(topHack)) {
                    hackSentSuccess = true;
                    break;
                }
                //}
            }
            if (!hackSentSuccess) {
                dprint(ns, "No more hack");
                break;
            }
            await ns.sleep(100);
        }
        dprint(ns, "Hack sending loop done.");
        if (currentHack.length < 1) {
            dprint(ns, "No hack successfully started");
        }
    }
    async function getAvailableThreads() {
        // Get available threads amount
        const messageFilter = m => m.payload.action === Action.threadsAvailable;
        const response = await messageHandler.sendAndWait(ChannelName.threadManager, new Payload(Action.getThreadsAvailable), null, true, messageFilter);
        //dprint(ns, "Getting available threads: " + response[0].payload.info)
        return response[0].payload.info;
    }
    async function startHack(hack) {
        dprint(ns, "=> " + hack.hackType + " to " + hack.host + " (RV: " + Math.round(hack.relativeValue * 1000) + ")");
        let executed = 0;
        currentHackId++;
        hack.id = currentHackId;
        for (let i = 0; i < 50; i++) {
            executed = ns.exec(HACKING_CONDUCTOR[hack.hackType], HACKING_SERVER, 1, JSON.stringify(hack), currentHackId);
            if (executed > 0) {
                hack.pid = executed;
                break;
            }
            await ns.sleep(100);
        }
        if (executed === 0) {
            dprint(ns, "Unable to start hack, process not starting.");
            return false;
        }
        // Awaiting hack to start before continuing, could probably be skipped when everything is more stable
        let messageFilter = (m) => m.payload.action === Action.hackReady;
        const response = await messageHandler.waitForAnswer(messageFilter, 15000);
        if (response.length === 0) {
            dprint(ns, "Hack got stuck somewhere.");
            return false;
        }
        if (response[0].payload.info === -1) {
            dprint(ns, "Unable to start hack, lack of threads");
            return false;
        }
        hack.startTime = Date.now();
        currentHack.push(hack);
        return true;
    }
    async function requestPause(message) {
        dprint(ns, "Pause requested");
        pauseRequested = true;
        for (const hack of currentHack) {
            await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.stop), hack.id);
        }
    }
    async function kill(message) {
        dprint(ns, "Kill requested");
        pauseRequested = true;
        killRequested = true;
        for (const hack of currentHack) {
            await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.kill), hack.id);
        }
    }
}
