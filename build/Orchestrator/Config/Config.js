import { HackType, RequiredScript } from "/Orchestrator/Enum/HackEnum";
import { Action, ChannelName } from "/Orchestrator/Enum/MessageEnum";
export const DEBUG = true;
export const MANAGING_SERVER = "home";
export const HACKING_SERVER = "home";
export const BASE_DIR = "/Orchestrator/";
export const HACKING_SCRIPTS = {
    [RequiredScript.hack]: "/Orchestrator/HackScript/hack.js",
    [RequiredScript.weaken]: "/Orchestrator/HackScript/weaken.js",
    [RequiredScript.grow]: "/Orchestrator/HackScript/grow.js",
};
export const MANAGER_SCRIPTS = {
    [ChannelName.messageManager]: "/Orchestrator/Manager/MessageManager.js",
    [ChannelName.threadManager]: "/Orchestrator/Manager/ThreadManager.js",
    [ChannelName.hackManager]: "/Orchestrator/Manager/HackManager.js",
    [ChannelName.targetManager]: "/Orchestrator/Manager/TargetManager.js",
    [ChannelName.serverManager]: "/Orchestrator/Manager/ServerManager.js"
};
export const HACKING_CONDUCTOR = {
    [HackType.fullMoneyHack]: "/Orchestrator/HackConductor/MoneyHackConductor.js",
    [HackType.quickMoneyHack]: "/Orchestrator/HackConductor/MoneyHackConductor.js",
    [HackType.xpHack]: "/Orchestrator/HackConductor/MoneyHackConductor.js",
    //[HackType.xpHack]: "/Orchestrator/HackConductor/XpHackConductor.js",
};
export const IMPORT_TO_COPY = [
    "/Orchestrator/Class/Message.js",
    "/Orchestrator/Enum/MessageEnum.js"
];
export const DEFAULT_HACKING_MODE = HackType.fullMoneyHack;
export const HACK_TYPE_PARTIAL_THREAD = [HackType.quickMoneyHack];
export const SERVER_INITIAL_RAM = 8;
export const BOOT_SCRIPTS = [
    ChannelName.messageManager,
    ChannelName.threadManager,
    ChannelName.hackManager,
    ChannelName.targetManager,
    ChannelName.serverManager
];
export const KILL_MESSAGE = m => m.payload.action === Action.kill;
export const PORT_CRACKER = [
    { file: "BruteSSH.exe", function: 'brutessh' },
    { file: "FTPCrack.exe", function: 'ftpcrack' },
    { file: "relaySMTP.exe", function: 'relaysmtp' },
    { file: "HTTPWorm.exe", function: 'httpworm' },
    { file: "SQLInject.exe", function: 'sqlinject' },
];
export const MIN_HACK_CHANCE = 0.5;
export const MIN_SERVER_FOR_UPDATE = 5;
