import { Action, ChannelName } from "/Orchestrator/Enum/MessageEnum";
import { Payload } from "/Orchestrator/Class/Message";
import { DEBUG, KILL_MESSAGE } from "/Orchestrator/Config/Config";
export async function copyFile(ns, fileList, host) {
    for (let j = 0; j < fileList.length; j++) {
        const script = fileList[j];
        ns.fileExists(script, host) && ns.rm(script, host);
        await ns.scp(script, "home", host);
    }
}
export async function getThreads(ns, amount, messageHandler, hack) {
    await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.getThreads, amount, false));
    const response = await messageHandler.waitForAnswer(m => m.payload.action === Action.threads);
    DEBUG && ns.print("Got threads: ");
    DEBUG && ns.print(response[0].payload.info);
    return response[0].payload.info;
}
export async function executeScript(ns, script, threads, hack, messageHandler, id) {
    DEBUG && ns.print("Executing scripts");
    let executedScript = 0;
    for (let i = 0; i < Object.keys(threads).length; i++) {
        const keyName = Object.keys(threads)[i];
        const pid = ns.exec(script, keyName, threads[keyName], hack.host, id);
        if (pid > 0) {
            executedScript++;
        }
        else {
            ns.tprint("Hack " + id + " targeting " + hack.host + " could not start script on " + keyName + " with " + threads[keyName] + " threads.");
            await freeThreads(ns, { keyName: threads[keyName] }, messageHandler);
        }
    }
    return executedScript;
}
export async function freeThreads(ns, allocatedThreads, messageHandler) {
    DEBUG && ns.print("Freeing threads");
    await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.freeThreads, allocatedThreads));
}
export async function checkForKill(ns, messageHandler) {
    const killMessage = await messageHandler.getMessagesInQueue(KILL_MESSAGE);
    if (killMessage.length > 0) {
        DEBUG && ns.print("Kill request");
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, "Killed"));
        return true;
    }
    return false;
}
export function calculateThreadsRatio(availableThreads, currentSecurity, minSecurity, growThreads, weakenThreads) {
    if ((growThreads + weakenThreads) <= availableThreads) {
        return { weakenThreads: weakenThreads, growThreads: growThreads };
    }
    const threadsForMinSecurity = (currentSecurity - minSecurity) / 0.05;
    const threadsLeft = availableThreads - threadsForMinSecurity;
    if (threadsForMinSecurity >= availableThreads) {
        return { weakenThreads: availableThreads, growThreads: 0 };
    }
    const calcWeakenThreads = Math.round(Math.ceil(threadsLeft / 13.5));
    const calcGrowThreads = Math.round(Math.ceil(threadsLeft - weakenThreads));
    if (calcGrowThreads < 0) {
        return { weakenThreads: availableThreads, growThreads: 0 };
    }
    return { weakenThreads: calcWeakenThreads + threadsForMinSecurity, growThreads: calcGrowThreads };
}
