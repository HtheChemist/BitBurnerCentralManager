import {HackType, RequiredScript} from "/Orchestrator/Enum/HackEnum";

export const DEBUG: boolean = true

export const HACKING_SERVER: string = "home"

export const HACKING_SCRIPTS: Record<RequiredScript, string> = {
    [RequiredScript.hack]: "/Orchestrator/HackScript/hack.ns",
    [RequiredScript.weaken]: "/Orchestrator/HackScript/weaken.ns",
    [RequiredScript.grow]: "/Orchestrator/HackScript/grow.ns",
}

export const HACKING_CONDUCTOR: Record<HackType, string> = {
    [HackType.fullMoneyHack]: "/Orchestrator/HackConductor/MoneyHackConductor.ns",
    [HackType.quickMoneyHack]: "/Orchestrator/HackConductor/MoneyHackConductor.ns",
    [HackType.xpHack]: "/Orchestrator/HackConductor/XpHackConductor.ns",
}

export const IMPORT_TO_COPY: string[] = [
    "/Orchestrator/Class/Message.ns"
]

export const DEFAULT_HACKING_MODE: HackType = HackType.fullMoneyHack

export const HACK_TYPE_PARTIAL_THREAD: HackType[] = [HackType.quickMoneyHack]

export const BOOT_SCRIPT: string[] = [
  "/Orchestrator/Manager/MessageManager.ns",
  "/Orchestrator/Manager/TargetManager.ns",
  "/Orchestrator/Manager/ThreadManager.ns",
  "/Orchestrator/Manager/HackManager.ns"
  ,
]