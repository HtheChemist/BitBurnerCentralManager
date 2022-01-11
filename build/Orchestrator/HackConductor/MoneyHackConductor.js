import { MessageHandler, Payload } from "/Orchestrator/Class/Message";
import { Action, ChannelName } from "/Orchestrator/Enum/MessageEnum";
import { DEBUG, HACKING_SCRIPTS, KILL_MESSAGE, MIN_HACK_CHANCE } from "/Orchestrator/Config/Config";
import { HackType } from "/Orchestrator/Enum/HackEnum";
import { Hack } from "/Orchestrator/Class/Hack";
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('exec');
    const myId = ns.args[1];
    const mySelf = ChannelName.hackConductor;
    const messageHandler = new MessageHandler(ns, mySelf, myId);
    const hack = Hack.fromJSON(ns.args[0]);
    DEBUG && ns.print("Starting hack: " + myId);
    const quickHackType = (hack.hackType !== HackType.fullMoneyHack && hack.hackChance < MIN_HACK_CHANCE) ? 'weaken' : 'hack';
    const growAllocatedThreads = hack.hackType === HackType.fullMoneyHack && await getThreads(hack.growThreads) || {};
    const weakenAllocatedThreads = (hack.hackType === HackType.fullMoneyHack || quickHackType === "weaken") && await getThreads(hack.weakenThreads) || {};
    const hackAllocatedThreads = quickHackType === 'hack' && await getThreads(hack.hackThreads);
    const numOfGrowHost = Object.keys(growAllocatedThreads).length;
    const numOfWeakenHost = Object.keys(weakenAllocatedThreads).length;
    const numOfHackHost = Object.keys(hackAllocatedThreads).length;
    let growResponseReceived = 0;
    let weakenResponseReceived = 0;
    let hackResponseReceived = 0;
    let hackValue = 0;
    const fullHackGotThreads = !!numOfGrowHost && !!numOfWeakenHost && !!numOfHackHost;
    const quickHackGotThreads = quickHackType === 'weaken' ? !!numOfWeakenHost : !!numOfHackHost;
    const gotThreads = hack.hackType === HackType.fullMoneyHack ? fullHackGotThreads : quickHackGotThreads;
    if (!gotThreads) {
        DEBUG && ns.print("Hack lack required threads");
        hackAllocatedThreads && await freeThreads(hackAllocatedThreads);
        weakenAllocatedThreads && await freeThreads(weakenAllocatedThreads);
        growAllocatedThreads && await freeThreads(growAllocatedThreads);
        return messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady, -1));
    }
    DEBUG && ns.print('Hack ready');
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady));
    if (hack.hackType === HackType.fullMoneyHack) {
        DEBUG && ns.print("Starting weaken script");
        DEBUG && ns.print("Starting grow script");
        executeScript(HACKING_SCRIPTS.weaken, weakenAllocatedThreads);
        executeScript(HACKING_SCRIPTS.grow, growAllocatedThreads);
        DEBUG && ns.print("Awaiting grow/weaken confirmation");
        while (true) {
            //const filter = m => (m.payload.action === Action.weakenScriptDone || m.payload.action === Action.growScriptDone)
            if (await checkForKill())
                return;
            const response = await messageHandler.popLastMessage();
            for (let k = 0; k < response.length; k++) {
                if (response[k].payload.action === Action.growScriptDone) {
                    growResponseReceived++;
                    DEBUG && ns.print("Received " + growResponseReceived + "/" + numOfGrowHost + " grow results");
                }
                else if (response[k].payload.action === Action.weakenScriptDone) {
                    weakenResponseReceived++;
                    DEBUG && ns.print("Received " + weakenResponseReceived + "/" + numOfWeakenHost + " weaken results");
                }
                else {
                    ns.tprint("Unexpected message: " + response[0]);
                }
            }
            if (weakenResponseReceived >= numOfWeakenHost && growResponseReceived >= numOfGrowHost) {
                DEBUG && ns.print("Weaken and grow completed.");
                await freeThreads(growAllocatedThreads);
                await freeThreads(weakenAllocatedThreads);
                break;
            }
            await ns.sleep(100);
        }
    }
    DEBUG && ns.print("Starting " + quickHackType + " script");
    executeScript(HACKING_SCRIPTS[quickHackType], hackAllocatedThreads || weakenAllocatedThreads);
    DEBUG && ns.print("Awaiting " + quickHackType + " confirmation");
    while (true) {
        const filter = quickHackType === 'weaken' ? m => (m.payload.action === Action.weakenScriptDone) : m => (m.payload.action === Action.hackScriptDone);
        const numOfHost = quickHackType === 'weaken' ? numOfWeakenHost : numOfHackHost;
        if (await checkForKill())
            return;
        const response = await messageHandler.popLastMessage();
        for (let k = 0; k < response.length; k++) {
            if (response[k].payload.action === Action.hackScriptDone) {
                hackResponseReceived++;
                hackValue += response[k].payload.info;
                DEBUG && ns.print("Received " + hackResponseReceived + "/" + numOfHost + " " + quickHackType + " results");
            }
            else {
                ns.tprint("Unexpected message: " + response[0]);
            }
        }
        if (hackResponseReceived >= numOfHost) {
            DEBUG && ns.print(quickHackType + " script completed");
            hackAllocatedThreads && await freeThreads(hackAllocatedThreads);
            weakenAllocatedThreads && await freeThreads(weakenAllocatedThreads);
            break;
        }
        await ns.sleep(100);
    }
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, hackValue));
    DEBUG && ns.print("Exiting");
    async function getThreads(amount) {
        DEBUG && ns.print("Getting threads");
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.getThreads, amount, hack.hackType !== HackType.quickMoneyHack));
        DEBUG && ns.print("Awaiting answer");
        const response = await messageHandler.waitForAnswer(m => m.payload.action === Action.threads);
        DEBUG && ns.print("Got answer");
        DEBUG && ns.print(response[0].payload.info);
        return response[0].payload.info;
    }
    function executeScript(script, threads) {
        DEBUG && ns.print("Executing scripts");
        for (let i = 0; i < Object.keys(threads).length; i++) {
            const keyName = Object.keys(threads)[i];
            ns.exec(script, keyName, threads[keyName], hack.host, myId);
        }
    }
    async function freeThreads(allocatedThreads) {
        DEBUG && ns.print("Freeing threads");
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.freeThreads, allocatedThreads));
    }
    async function checkForKill() {
        const killMessage = await messageHandler.getMessagesInQueue(KILL_MESSAGE);
        if (killMessage.length > 0) {
            DEBUG && ns.print("Kill request");
            await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, "Killed"));
            return true;
        }
        return false;
    }
}
