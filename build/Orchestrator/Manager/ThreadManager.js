/** @param {NS} ns **/
import { MessageHandler, Payload, } from "/Orchestrator/Class/Message";
import { DEBUG, HACKING_SCRIPTS, HACKING_SERVER, MANAGING_SERVER, } from "/Orchestrator/Config/Config";
import { Action, ChannelName } from "/Orchestrator/Enum/MessageEnum";
export class Thread {
    constructor(host, inUse) {
        this.host = host;
        this.inUse = inUse;
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
        [Action.kill]: kill
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
        let host = message.payload.info;
        // If the host is the one from which the Hack emanate we skip it
        if (host === HACKING_SERVER || host === MANAGING_SERVER)
            return;
        const hostThreads = Math.floor(((ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ramChunk));
        DEBUG && ns.print("Got new host: " + host + " with " + hostThreads + " threads");
        for (let j = 0; j < hostThreads; j++) {
            threads.push(new Thread(host, false));
        }
    }
    async function getAvailableThreads(message) {
        DEBUG && ns.print("Got thread request from: " + message.origin + " for available threads");
        let availableThreads = threads.filter(thread => !thread.inUse).length;
        let payload = new Payload(Action.threadsAvailable, availableThreads);
        await messageHandler.sendMessage(message.origin, payload, message.originId);
    }
    async function getThreads(message) {
        let number = message.payload.info;
        const exact = message.payload.extra !== false;
        const unusedThreads = threads.filter(thread => !thread.inUse);
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
        const allocatedThreadsByHost = uniqueHost.reduce((acc, cur) => (acc[cur] = allocatedThreads.filter(t => t.host == cur).length, acc), {});
        DEBUG && ns.print("Allocated " + allocatedThreads.length + " threads to hack " + message.originId);
        await messageHandler.sendMessage(message.origin, new Payload(Action.threads, allocatedThreadsByHost), message.originId);
    }
    async function freeThreads(message) {
        DEBUG && ns.print("Received thread freeing request from " + message.origin + "(Origin ID: " + message.originId + ")");
        const threadsInfo = message.payload.info;
        for (let i = 0; i < Object.keys(threadsInfo).length; i++) {
            const host = Object.keys(threadsInfo)[i];
            const usedThreads = threads.filter(thread => thread.inUse && thread.host === host).slice(0, threadsInfo[host]);
            usedThreads.map(thread => thread.inUse = false);
            DEBUG && ns.print("Deallocated " + threadsInfo[host] + " threads of " + host);
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
        for (let i = 0; i < uniqueHost.length; i++) {
            ns.killall(uniqueHost[i]);
        }
        killrequest = true;
    }
}
