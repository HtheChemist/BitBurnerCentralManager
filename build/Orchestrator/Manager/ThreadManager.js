/** @param {NS} ns **/
import { MessageHandler, Payload, } from "/Orchestrator/Class/Message";
import { DEBUG, HACKING_SCRIPTS, HACKING_SERVER, MANAGING_SERVER, } from "/Orchestrator/Config/Config";
import { Action, ChannelName } from "/Orchestrator/Enum/MessageEnum";
export class Thread {
    constructor(host, inUse) {
        this.host = host;
        this.inUse = inUse;
        this.locked = false;
    }
}
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('getScriptRam');
    ns.disableLog('getServerMaxRam');
    ns.disableLog('getServerUsedRam');
    const mySelf = ChannelName.threadManager;
    let threads = [];
    let killrequest = false;
    const messageActions = {
        [Action.getThreads]: getThreads,
        [Action.getThreadsAvailable]: getAvailableThreads,
        [Action.addHost]: addHost,
        [Action.freeThreads]: freeThreads,
        [Action.updateHost]: updateHost,
        [Action.kill]: kill,
        [Action.consoleThreadsUse]: consoleThreadsUse,
        [Action.lockHost]: lockHost,
        [Action.getTotalThreads]: getTotalThreads
    };
    const messageHandler = new MessageHandler(ns, mySelf);
    const ramChunk = Math.max(...Object.values(HACKING_SCRIPTS).map(script => ns.getScriptRam(script)));
    while (true) {
        if (killrequest)
            break;
        const lastMessage = await messageHandler.popLastMessage();
        lastMessage.length > 0 && await messageActions[lastMessage[0].payload.action]?.(lastMessage[0]);
        await ns.sleep(100);
    }
    DEBUG && ns.tprint("Exiting");
    async function addHost(message) {
        const host = message.payload.info;
        const hosts = [...new Set(threads.map(thread => thread.host))];
        // If the host is the one from which the Hack emanate we skip it
        if (host === HACKING_SERVER || host === MANAGING_SERVER)
            return;
        if (hosts.includes(host))
            await updateHost(message);
        const hostThreads = Math.floor(((ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ramChunk));
        DEBUG && ns.print("Got new host: " + host + " with " + hostThreads + " threads");
        for (let j = 0; j < hostThreads; j++)
            threads.push(new Thread(host, false));
    }
    async function getTotalThreads(message) {
        const payload = new Payload(Action.totalThreads, threads.filter(t => !t.locked).length);
        await messageHandler.sendMessage(message.origin, payload, message.originId);
    }
    async function getAvailableThreads(message) {
        //DEBUG && ns.print("Got thread request from: " + message.origin + " for available threads")
        let payload = new Payload(Action.threadsAvailable, 0);
        if (threads.length) {
            let availableThreads = threads.filter(thread => (!thread.inUse && !thread.locked)).length;
            payload = new Payload(Action.threadsAvailable, availableThreads);
        }
        await messageHandler.sendMessage(message.origin, payload, message.originId);
    }
    async function getThreads(message) {
        let number = message.payload.info;
        const exact = message.payload.extra !== false;
        if (threads.length === 0) {
            DEBUG && ns.print("Thread manager not ready.");
            await messageHandler.sendMessage(message.origin, new Payload(Action.threads, {}), message.originId);
            return;
        }
        const unusedThreads = threads.filter(thread => (!thread.inUse && !thread.locked));
        DEBUG && ns.print("Got thread request from: " + message.originId + " for " + number + " threads (Exact: " + exact + ")");
        // -1 will return all available threads
        if (number === -1) {
            number = unusedThreads.length;
        }
        if (unusedThreads.length < number && exact) {
            DEBUG && ns.print("Not enough threads");
            await messageHandler.sendMessage(message.origin, new Payload(Action.threads, {}), message.originId);
            return;
        }
        const allocatedThreads = unusedThreads.slice(0, number);
        allocatedThreads.map(thread => thread.inUse = true);
        const uniqueHost = [...new Set(allocatedThreads.map(thread => thread.host))];
        const allocatedThreadsByHost = uniqueHost.reduce((acc, cur) => {
            acc[cur] = allocatedThreads.filter(t => t.host == cur).length;
            return acc;
        }, {});
        DEBUG && ns.print("Allocated " + allocatedThreads.length + " threads to hack " + message.originId);
        await messageHandler.sendMessage(message.origin, new Payload(Action.threads, allocatedThreadsByHost), message.originId);
    }
    async function freeThreads(message) {
        DEBUG && ns.print("Received thread freeing request from " + message.origin + "(Origin ID: " + message.originId + ")");
        const threadsInfo = message.payload.info;
        for (const host of Object.keys(threadsInfo)) {
            for (let i = 0; i < threadsInfo[host]; i++) {
                const threadIndex = threads.findIndex(t => (t.inUse && t.host === host));
                if (threadIndex)
                    threads[threadIndex].inUse = false;
            }
            DEBUG && ns.print("Deallocated " + threadsInfo[host] + " threads of " + host);
            await checkLockedStatus(host);
        }
    }
    async function checkLockedStatus(hostname) {
        const hostThreads = threads.filter(t => (t.host === hostname));
        if (hostThreads.some(t => t.locked) && !hostThreads.some(t => t.inUse)) {
            await messageHandler.sendMessage(ChannelName.serverManager, new Payload(Action.hostLocked, hostname));
        }
    }
    async function updateHost(message) {
        DEBUG && ns.print("Updating threads amount on " + message.payload.info);
        const host = message.payload.info;
        threads = threads.filter(t => t.host !== host);
        await addHost(message);
    }
    async function kill() {
        DEBUG && ns.print("Kill request. Kill all threads");
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
            ns.tprint(host + " ".repeat(padding) + ": [" + "|".repeat(numberOfBar) + "-".repeat(numberOfDash) + "] (" + hostThreadsInUse.length + "/" + hostThreads.length + ")  " + hostUsedRam + " GiB/" + hostMaxRam + " GiB");
        }
    }
    async function lockHost(message) {
        for (const thread of threads)
            if (thread.host === message.payload.info)
                thread.locked = true;
        await checkLockedStatus(message.payload.info);
    }
}
