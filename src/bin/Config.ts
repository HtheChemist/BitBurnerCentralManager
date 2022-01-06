import {HackType, RequiredScript} from "./Enum/HackEnum";

export const DEBUG: boolean = false

export const HACKING_SERVER: string = "home"

export const HACKING_SCRIPTS: Record<RequiredScript, string> = {
    [RequiredScript.hack]: "hack.js",
    [RequiredScript.weaken]: "weaken.js",
    [RequiredScript.grow]: "grow.js",
}

export const HACKING_CONDUCTOR: Record<HackType, string> = {
    [HackType.fullMoneyHack]: "MoneyHackConductor.js",
    [HackType.quickMoneyHack]: "MoneyHackConductor.js",
    [HackType.xpHack]: "XpHackConductor.js",
}

export const DEFAULT_HACKING_MODE = HackType.fullMoneyHack

