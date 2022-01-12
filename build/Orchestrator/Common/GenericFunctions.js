export async function copyFile(ns, fileList, host) {
    for (let j = 0; j < fileList.length; j++) {
        const script = fileList[j];
        ns.fileExists(script, host) && ns.rm(script, host);
        await ns.scp(script, "home", host);
    }
}
