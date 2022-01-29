import {NS} from "Bitburner";
import {DEBUG} from "/Orchestrator/Config/Debug";

export function dprint(ns: NS, message: string) {
    if (DEBUG) {
        const now: Date = new Date(Date.now())
        const hour: number = now.getHours()
        const minute: number = now.getMinutes()
        const second: number = now.getSeconds()
        const timestamp: string = hour + ":" + minute + ":" + second
        ns.print(timestamp + ": " + message)
    }
}