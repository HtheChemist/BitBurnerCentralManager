import { DEBUG } from "/Orchestrator/Config/Config";
export function dprint(ns, message) {
    if (DEBUG) {
        const now = new Date(Date.now());
        const hour = now.getHours();
        const minute = now.getMinutes();
        const second = now.getSeconds();
        const timestamp = hour + ":" + minute + ":" + second;
        ns.print(timestamp + ": " + message);
    }
}
