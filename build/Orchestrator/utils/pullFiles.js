import { RepoInit } from "/lib/Helpers";
export async function main(ns) {
    const initRepo = new RepoInit(ns);
    await initRepo.pullScripts();
}
