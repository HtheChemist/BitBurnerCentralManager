import { Action, ChannelName } from "/Orchestrator/MessageManager/enum";
import { Payload } from "/Orchestrator/MessageManager/class";
import { KILL_MESSAGE } from "/Orchestrator/Config/Config";
import { freeThreads } from "/Orchestrator/ThreadManager/common";
import { dprint } from "/Orchestrator/Common/Dprint";
export async function copyFile(ns, fileList, host) {
    for (let j = 0; j < fileList.length; j++) {
        const script = fileList[j];
        ns.fileExists(script, host) && ns.rm(script, host);
        await ns.scp(script, "home", host);
    }
}
export async function executeScript(ns, script, threads, hack, messageHandler, id) {
    dprint(ns, "Executing scripts: " + script);
    let executedScript = 0;
    for (const host of Object.keys(threads)) {
        if (threads[host] === 0)
            continue;
        const pid = ns.exec(script, host, threads[host], hack.host, id, executedScript);
        if (pid > 0) {
            executedScript++;
        }
        else {
            dprint(ns, "Hack " + id + " targeting " + hack.host + " could not start script on " + host + " with " + threads[host] + " threads.");
            await freeThreads(ns, { keyName: threads[host] }, messageHandler);
        }
    }
    return executedScript;
}
export async function checkForKill(ns, messageHandler) {
    const killMessage = await messageHandler.getMessagesInQueue(KILL_MESSAGE);
    if (killMessage.length > 0) {
        dprint(ns, "Kill request");
        await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, "Killed"));
        return true;
    }
    return false;
}
export function formatMoney(n, decimalPlaces = 3) {
    const levels = [1e30, 1e27, 1e24, 1e21, 1e18, 1e15, 1e12, 1e9, 1e6, 1e3];
    const notations = ["n", "o", "S", "s", "Q", "q", "t", "b", "m", "k"];
    if (n === Infinity)
        return "∞";
    for (const [index, level] of levels.entries()) {
        if (n >= level) {
            const number = Math.round((n / level) * (Math.pow(10, decimalPlaces))) / (10 * decimalPlaces);
            return number + notations[index] + "$";
        }
    }
    return n + "$";
}
