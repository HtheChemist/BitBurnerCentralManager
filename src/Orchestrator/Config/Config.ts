import {HackMode, HackType, RequiredScript} from "/Orchestrator/HackManager/enum";
import {Action, ChannelName} from "/Orchestrator/MessageManager/enum";
import {Message} from "/Orchestrator/MessageManager/class";

export const DEBUG: boolean = true

export const MANAGING_SERVER: string = "home"
export const HACKING_SERVER: string = "home"
export const THREAD_SERVER: string = "home"
export const BASE_DIR: string = "/Orchestrator/"

export const HACKING_SCRIPTS: Record<RequiredScript, string> = {
    [RequiredScript.hack]: "/Orchestrator/HackManager/script/hack.js",
    [RequiredScript.weaken]: "/Orchestrator/HackManager/script/weaken.js",
    [RequiredScript.grow]: "/Orchestrator/HackManager/script/grow.js",
    [RequiredScript.xp]: "/Orchestrator/HackManager/script/xp.js",
}

export const MANAGER_SCRIPTS: Partial<Record<ChannelName, { script: string; server: string }>> = {
    [ChannelName.messageManager]: {
        script: "/Orchestrator/MessageManager/manager.js",
        server: MANAGING_SERVER
    },
    [ChannelName.threadManager]: {
        script: "/Orchestrator/ThreadManager/manager.js",
        server: THREAD_SERVER
    },
    [ChannelName.hackManager]: {
        script: "/Orchestrator/HackManager/manager.js",
        server: MANAGING_SERVER
    },
    [ChannelName.targetManager]: {
        script: "/Orchestrator/TargetManager/manager.js",
        server: MANAGING_SERVER
    },
    [ChannelName.serverManager]: {
        script: "/Orchestrator/ServerManager/manager.js",
        server: MANAGING_SERVER
    }
}

export const HACKING_CONDUCTOR: Record<HackType, string> = {
    [HackType.growWeakenHack]: "/Orchestrator/HackManager/conductor/GrowWeakenConductor.js",
    [HackType.moneyHack]: "/Orchestrator/HackManager/conductor/MoneyHackConductor.js",
    [HackType.xpHack]: "/Orchestrator/HackManager/conductor/XpHackConductor.js",
}

export const HACK_MODE: Record<HackMode, HackType[]> = {
    [HackMode.money]: [HackType.moneyHack, HackType.growWeakenHack],
    [HackMode.xp]: [HackType.xpHack]
}

export const IMPORT_TO_COPY: string[] = [
    "/Orchestrator/MessageManager/class.js",
    "/Orchestrator/MessageManager/enum.js",
    "/Orchestrator/Common/Dprint.js",
    "/Orchestrator/Config/Config.js",
    "/Orchestrator/HackManager/enum.js",
]

export const DEFAULT_HACKING_MODE: HackMode = HackMode.money

export const HACK_TYPE_PARTIAL_THREAD: HackType[] = [HackType.growWeakenHack]

export const SERVER_INITIAL_RAM: number = 8

export const BOOT_SCRIPTS: string[] = [
    ChannelName.messageManager,
    ChannelName.threadManager,
    ChannelName.hackManager,
    ChannelName.targetManager,
    ChannelName.serverManager
]

export const KILL_MESSAGE: (m: Message) => boolean = m => m.payload.action === Action.kill

export const PORT_CRACKER = (ns) => [
    {file: "BruteSSH.exe", function: ns.brutessh},
    {file: "FTPCrack.exe", function: ns.ftpcrack},
    {file: "relaySMTP.exe", function: ns.relaysmtp},
    {file: "HTTPWorm.exe", function: ns.httpworm},
    {file: "SQLInject.exe", function: ns.sqlinject},
];

export const MIN_HACK_CHANCE: number = 0.5

export const MIN_SERVER_FOR_UPDATE: number = 1

export const MAX_SERVER_RAM: number = -1

export const MONEY_HACKING_TARGET_PERCENT: number = 0.95

export const USE_LOGISTIC_PROBABILITY: boolean = true

export const TIMEOUT_THRESHOLD: number = 180*1000 // 3 minutes seems to be the sweet spot