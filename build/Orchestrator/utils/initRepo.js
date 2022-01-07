const params = {
    baseUrl: "https://raw.githubusercontent.com/HtheChemist/BitBurnerCentralManager/master/build/",
    manifest: {
        sourceFile: "resources/manifest.txt",
        destFile: "/resources/manifest.txt",
    },
    helpers: {
        sourceFile: "lib/Helpers.ns",
        destFile: "/lib/Helpers.ns",
    },
    pullFiles: {
        sourceFile: "Orchestrator/utils/pullFiles.ns",
        destFile: "/Orchestrator/utils/pullFiles.ns",
    },
};
async function pullFile(ns, file) {
    const manifestUrl = `${params.baseUrl}${file.sourceFile}`;
    ns.tprintf(`INFO   > Downloading ${manifestUrl} -> ${file.destFile}`);
    if (ns.fileExists(file.destFile))
        ns.rm(file.destFile);
    if (!(await ns.wget(manifestUrl, file.destFile, "home"))) {
        ns.tprintf(`ERROR  > ${manifestUrl} -> ${file.destFile} failed.`);
        ns.exit();
    }
}
/** @param {NS} ns **/
export async function main(ns) {
    const files = [params.helpers, params.manifest, params.pullFiles];
    for (let file of files) {
        await pullFile(ns, file);
    }
    ns.tprintf(`INFO   > Successfully pulled initial files!`);
    ns.tprintf(`INFO   > Running download script...`);
    await ns.sleep(250);
    ns.run(params.pullFiles.destFile);
}
