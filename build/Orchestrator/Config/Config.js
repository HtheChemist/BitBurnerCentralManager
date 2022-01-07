import { HackType, RequiredScript } from "/Orchestrator/Enum/HackEnum";
export const DEBUG = true;
export const HACKING_SERVER = "home";
export const HACKING_SCRIPTS = {
    [RequiredScript.hack]: "/Orchestrator/HackScript/hack.ns",
    [RequiredScript.weaken]: "/Orchestrator/HackScript/weaken.ns",
    [RequiredScript.grow]: "/Orchestrator/HackScript/grow.ns",
};
export const HACKING_CONDUCTOR = {
    [HackType.fullMoneyHack]: "/Orchestrator/HackConductor/MoneyHackConductor.ns",
    [HackType.quickMoneyHack]: "/Orchestrator/HackConductor/MoneyHackConductor.ns",
    [HackType.xpHack]: "/Orchestrator/HackConductor/XpHackConductor.ns",
};
export const IMPORT_TO_COPY = [
    "/Orchestrator/Class/Message.ns",
    "/Orchestrator/Enum/MessageEnum.ns"
];
export const DEFAULT_HACKING_MODE = HackType.fullMoneyHack;
export const HACK_TYPE_PARTIAL_THREAD = [HackType.quickMoneyHack];
export const BOOT_SCRIPT = [
    "/Orchestrator/Manager/MessageManager.ns",
    "/Orchestrator/Manager/ThreadManager.ns",
    "/Orchestrator/Manager/HackManager.ns",
    "/Orchestrator/Manager/ServerManager.ns",
    "/Orchestrator/Manager/TargetManager.ns"
];
export const SERVER_INITIAL_RAM = 8;
