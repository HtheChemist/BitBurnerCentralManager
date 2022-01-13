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
    const quickHackType = (hack.hackType !== HackType.fullMoneyHack && hack.hackChance < MIN_HACK_CHANCE && hack.weakenThreads !== 0) ? 'weaken' : 'hack';
    const growAllocatedThreads = hack.hackType === HackType.fullMoneyHack ? await getThreads(hack.growThreads) : {};
    const weakenAllocatedThreads = hack.hackType === HackType.fullMoneyHack ? await getThreads(hack.weakenThreads) : {};
    const hackAllocatedThreads = quickHackType === "hack" ? await getThreads(hack.hackThreads) : await getThreads(hack.weakenThreads);
    let numOfGrowHost = Object.keys(growAllocatedThreads).length;
    let numOfWeakenHost = Object.keys(weakenAllocatedThreads).length;
    let numOfHackHost = Object.keys(hackAllocatedThreads).length;
    let growResponseReceived = 0;
    let weakenResponseReceived = 0;
    let hackResponseReceived = 0;
    let hackValue = 0;
    const fullHackGotThreads = !!numOfGrowHost && !!numOfWeakenHost;
    const hackGotThreads = !!numOfHackHost;
    const gotThreads = hack.hackType === HackType.fullMoneyHack ? fullHackGotThreads && hackGotThreads : hackGotThreads;
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
        numOfWeakenHost = await executeScript(HACKING_SCRIPTS.weaken, weakenAllocatedThreads);
        numOfGrowHost = await executeScript(HACKING_SCRIPTS.grow, growAllocatedThreads);
        DEBUG && ns.print("Awaiting grow/weaken confirmation");
        while (true) {
            //const filter = m => (m.payload.action === Action.weakenScriptDone || m.payload.action === Action.growScriptDone)
            //if(await checkForKill()) return
            const response = await messageHandler.getMessagesInQueue();
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
    numOfHackHost = await executeScript(HACKING_SCRIPTS[quickHackType], hackAllocatedThreads);
    DEBUG && ns.print("Awaiting " + quickHackType + " confirmation");
    const expectedResponse = quickHackType === "weaken" ? Action.weakenScriptDone : Action.hackScriptDone;
    while (true) {
        //if(await checkForKill()) return
        const response = await messageHandler.getMessagesInQueue();
        for (let k = 0; k < response.length; k++) {
            if (response[k].payload.action === expectedResponse) {
                hackResponseReceived++;
                hackValue += response[k].payload.info;
                DEBUG && ns.print("Received " + hackResponseReceived + "/" + numOfHackHost + " " + quickHackType + " results");
            }
            else {
                ns.tprint("Unexpected message: " + response[0]);
            }
        }
        if (hackResponseReceived >= numOfHackHost) {
            DEBUG && ns.print(quickHackType + " script completed");
            await freeThreads(hackAllocatedThreads);
            break;
        }
        await ns.sleep(100);
    }
    await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, hackValue));
    DEBUG && ns.print("Exiting");
    async function getThreads(amount) {
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.getThreads, amount, hack.hackType !== HackType.quickMoneyHack));
        const response = await messageHandler.waitForAnswer(m => m.payload.action === Action.threads);
        DEBUG && ns.print("Got threads: ");
        DEBUG && ns.print(response[0].payload.info);
        return response[0].payload.info;
    }
    async function executeScript(script, threads) {
        DEBUG && ns.print("Executing scripts");
        let executedScript = 0;
        for (let i = 0; i < Object.keys(threads).length; i++) {
            const keyName = Object.keys(threads)[i];
            const pid = ns.exec(script, keyName, threads[keyName], hack.host, myId);
            if (pid > 0) {
                executedScript++;
            }
            else {
                ns.tprint("Hack " + myId + " targeting " + hack.host + " could not start script on " + keyName + " with " + threads[keyName] + " threads.");
                await freeThreads({ keyName: threads[keyName] });
            }
        }
        return executedScript;
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
