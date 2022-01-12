import {NS} from "Bitburner";

export async function copyFile(ns: NS, fileList: string[], host) {
    for (let j = 0; j < fileList.length; j++) {
        const script: string = fileList[j]
        ns.fileExists(script, host) && ns.rm(script, host)
        await ns.scp(script, "home", host);
    }
}