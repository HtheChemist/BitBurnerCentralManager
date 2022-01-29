/** @param {NS} ns **/
import { MessageHandler, Payload, } from "/Orchestrator/MessageManager/class";
import { HACKING_SCRIPTS, HACKING_SERVER, MANAGING_SERVER, SHARING_SCRIPT, THREAD_SERVER, TIMEOUT_THRESHOLD, USE_SHARE, } from "/Orchestrator/Config/Config";
import { Action, ChannelName } from "/Orchestrator/MessageManager/enum";
import { dprint } from "/Orchestrator/Common/Dprint";
import { DEBUG } from "/Orchestrator/Config/Debug";
export class Thread {
    constructor(host, inUse) {
        this.host = host;
        this.inUse = inUse;
        this.locked = false;
        this.expectedRelease = null;
    }
}
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('getScriptRam');
    ns.disableLog('getServerMaxRam');
    ns.disableLog('getServerUsedRam');
    ns.disableLog('exec');
    const mySelf = ChannelName.threadManager;
    let threads = [];
    let killrequest = false;
    let lockedHost = [];
    let useShare = USE_SHARE;
    const messageActions = {
        [Action.getThreads]: getThreads,
        [Action.getThreadsAvailable]: getAvailableThreads,
        [Action.addHost]: addHost,
        [Action.freeThreads]: freeThreads,
        [Action.updateHost]: updateHost,
        [Action.kill]: kill,
        [Action.consoleThreadsUse]: consoleThreadsUse,
        [Action.lockHost]: lockHost,
        [Action.getTotalThreads]: getTotalThreads,
        [Action.useShareSwitch]: useShareSwitch,
    };
    const messageHandler = new MessageHandler(ns, mySelf);
    const ramChunk = Math.max(...Object.values(HACKING_SCRIPTS).map(script => ns.getScriptRam(script)));
    const shareChunk = ns.getScriptRam(SHARING_SCRIPT);
    while (true) {
        if (killrequest)
            break;
        const lastMessage = await messageHandler.popLastMessage();
        lastMessage.length > 0 && await messageActions[lastMessage[0].payload.action]?.(lastMessage[0]);
        //cleanup()
        await ns.sleep(100);
    }
    dprint(ns, "Exiting");
    function cleanup() {
        let orphanThreads = 0;
        for (let i = 0; i < threads.length; i++) {
            const threadIndex = threads.findIndex(t => (t.inUse && (t.expectedRelease && t.expectedRelease < Date.now())));
            if (threadIndex === -1)
                return;
            threads[threadIndex].inUse = false;
            threads[threadIndex].expectedRelease = null;
            orphanThreads++;
        }
        DEBUG && ns.tprint("Cleaned up " + orphanThreads + " orphan threads.");
    }
    async function useShareSwitch(message) {
        useShare = !useShare;
        const hosts = [...new Set(threads.map(thread => thread.host))];
        for (const host of hosts) {
            killAndRestartShare(host);
        }
    }
    function killAndRestartShare(host) {
        const nbOfThreadsInUse = threads.filter(t => (t.host === host && t.inUse)).length;
        const nbOfShareThreads = Math.floor((ns.getServerMaxRam(host) - (nbOfThreadsInUse * ramChunk)) / shareChunk);
        ns.kill(SHARING_SCRIPT, host);
        if (!lockedHost.includes(host) && nbOfShareThreads > 0 && useShare) {
            ns.exec(SHARING_SCRIPT, host, nbOfShareThreads);
        }
    }
    async function addHost(message) {
        const host = message.payload.info;
        const hosts = [...new Set(threads.map(thread => thread.host))];
        // If the host is the one from which the Hack emanate we skip it
        if (host === HACKING_SERVER || host === MANAGING_SERVER || host === THREAD_SERVER)
            return;
        if (hosts.includes(host))
            await updateHost(message);
        const hostThreads = Math.floor(((ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ramChunk));
        dprint(ns, "Got new host: " + host + " with " + hostThreads + " threads");
        for (let j = 0; j < hostThreads; j++)
            threads.push(new Thread(host, false));
        useShare && killAndRestartShare(host);
    }
    async function getTotalThreads(message) {
        const payload = new Payload(Action.totalThreads, threads.filter(t => !t.locked).length);
        await messageHandler.sendMessage(message.origin, payload, message.originId);
    }
    async function getAvailableThreads(message) {
        //dprint(ns, "Got thread request from: " + message.origin + " for available threads")
        let payload = new Payload(Action.threadsAvailable, 0);
        if (threads.length) {
            let availableThreads = threads.filter(thread => (!thread.inUse && !thread.locked)).length;
            payload = new Payload(Action.threadsAvailable, availableThreads);
        }
        await messageHandler.sendMessage(message.origin, payload, message.originId);
    }
    async function getThreads(message) {
        let number = message.payload.info;
        const exact = message.payload.extra?.['exact'] || false;
        const expectedTime = message.payload.extra?.['time'] || null;
        if (threads.length === 0) {
            dprint(ns, "Thread manager not ready.");
            await messageHandler.sendMessage(message.origin, new Payload(Action.threads, {}), message.originId);
            return;
        }
        const unusedThreads = threads.filter(thread => (!thread.inUse && !thread.locked));
        dprint(ns, "Got thread request from: " + message.originId + " for " + number + " threads (Exact: " + exact + ")");
        // -1 will return all available threads [Deprecated]
        if (number === -1) {
            number = unusedThreads.length;
        }
        if (unusedThreads.length < number && exact) {
            dprint(ns, "Not enough threads");
            await messageHandler.sendMessage(message.origin, new Payload(Action.threads, {}), message.originId);
            return;
        }
        const allocatedThreads = unusedThreads.slice(0, number);
        allocatedThreads.map(thread => {
            thread.inUse = true;
            if (expectedTime)
                thread.expectedRelease = Date.now() + expectedTime + TIMEOUT_THRESHOLD;
        });
        const uniqueHost = [...new Set(allocatedThreads.map(thread => thread.host))];
        const allocatedThreadsByHost = uniqueHost.reduce((acc, cur) => {
            acc[cur] = allocatedThreads.filter(t => t.host == cur).length;
            return acc;
        }, {});
        if (useShare) {
            for (const host of Object.keys(allocatedThreadsByHost)) {
                killAndRestartShare(host);
            }
        }
        dprint(ns, "Allocated " + allocatedThreads.length + " threads to hack " + message.originId);
        await messageHandler.sendMessage(message.origin, new Payload(Action.threads, allocatedThreadsByHost), message.originId);
    }
    async function freeThreads(message) {
        dprint(ns, "Received thread freeing request from " + message.origin + "(Origin ID: " + message.originId + ")");
        const threadsInfo = message.payload.info;
        for (const host of Object.keys(threadsInfo)) {
            const usedThreadFilter = t => (t.inUse && t.host === host);
            const usedThreads = threads.filter(usedThreadFilter); // We filter the used threads for the host
            threads = threads.filter(t => !usedThreadFilter(t)); // We remove those thread from the current pool
            const threadsToRelease = usedThreads.splice(0, threadsInfo[host]); // We remove the thread that we want to release
            threads.push(...usedThreads); // We read the still used threads in the pool
            const releasedThreads = threadsToRelease.map(t => {
                const thread = new Thread(t.host, false);
                thread.locked = t.locked;
                return thread;
            });
            threads.push(...releasedThreads);
            // for (let i = 0; i < threadsInfo[host]; i++) {
            //     const threadIndex = threads.findIndex(t => (t.inUse && t.host === host))
            //     if (threadIndex>=0) {
            //         threads[threadIndex].inUse = false
            //         threads[threadIndex].expectedRelease = null
            //     }
            // }
            dprint(ns, "Deallocated " + threadsInfo[host] + " threads of " + host);
            useShare && killAndRestartShare(host);
            await checkLockedStatus(host);
            await ns.sleep(100); // Throttle
        }
    }
    async function checkLockedStatus(hostname) {
        const hostThreads = threads.filter(t => (t.host === hostname));
        if (lockedHost.includes(hostname) && !hostThreads.some(t => t.inUse)) {
            await messageHandler.sendMessage(ChannelName.serverManager, new Payload(Action.hostLocked, hostname));
        }
    }
    async function updateHost(message) {
        dprint(ns, "Updating threads amount on " + message.payload.info);
        const host = message.payload.info;
        lockedHost = lockedHost.filter(h => h !== message.payload.info);
        threads = threads.filter(t => t.host !== host);
        await addHost(message);
    }
    async function kill() {
        dprint(ns, "Kill request. Kill all threads");
        const usedThreads = threads.filter(t => t.inUse = true);
        const uniqueHost = [...new Set(usedThreads.map(thread => thread.host))];
        for (const host of uniqueHost) {
            ns.killall(host);
        }
        killrequest = true;
    }
    async function consoleThreadsUse(message) {
        for (const host of [...new Set(threads.map(thread => thread.host))]) {
            const hostUsedRam = ns.getServerUsedRam(host);
            const hostMaxRam = ns.getServerMaxRam(host);
            const hostThreads = threads.filter(t => t.host === host);
            const hostThreadsInUse = hostThreads.filter(t => t.inUse);
            const numberOfBar = hostThreads.length ? Math.round((hostThreadsInUse.length / hostThreads.length * 20)) : 20;
            const numberOfDash = 20 - numberOfBar;
            const padding = 20 - host.length;
            const barSymbol = lockedHost.includes(host) ? "X" : "|";
            const dashSymbol = lockedHost.includes(host) ? "*" : "-";
            ns.tprint(host + " ".repeat(padding) + ": [" + barSymbol.repeat(numberOfBar) + dashSymbol.repeat(numberOfDash) + "] (" + hostThreadsInUse.length + "/" + hostThreads.length + ")  " + hostUsedRam + " GiB/" + hostMaxRam + " GiB");
        }
    }
    async function lockHost(message) {
        const host = message.payload.info;
        lockedHost.push(host);
        useShare && killAndRestartShare(host);
        for (const thread of threads)
            if (thread.host === host)
                thread.locked = true;
        await checkLockedStatus(host);
    }
}
