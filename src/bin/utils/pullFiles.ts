import type {NS} from "Bitburner";
import {RepoInit} from "/lib/Helpers";

export async function main(ns: NS) {
    const initRepo = new RepoInit(ns);

    await initRepo.pullScripts();
}
