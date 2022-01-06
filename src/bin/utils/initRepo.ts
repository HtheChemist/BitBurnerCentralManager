import {NS} from "Bitburner";

const params = {
    baseUrl: "http://localhost:9182/",
    manifest: {
        sourceFile: "resources/manifest.txt",
        destFile: "/resources/manifest.txt",
    },
    helpers: {
        sourceFile: "lib/Helpers.ns",
        destFile: "/lib/Helpers.ns",
    },
    pullFiles: {
        sourceFile: "bin/utils/pullFiles.ns",
        destFile: "/bin/utils/pullFiles.ns",
    },
};

async function pullFile(
    ns: NS,
    file: { sourceFile: string; destFile: string }
) {
    const manifestUrl = `${params.baseUrl}${file.sourceFile}`;
    ns.tprintf(
        `INFO   > Downloading ${manifestUrl} -> ${file.destFile}`
    );

    if (!(await ns.wget(manifestUrl, file.destFile, "home"))) {
        ns.tprintf(`ERROR  > ${manifestUrl} -> ${file.destFile} failed.`);
        ns.exit();
    }
}

/** @param {NS} ns **/
export async function main(ns: NS) {
    const files = [params.helpers, params.manifest, params.pullFiles];

    for (let file of files) {
        await pullFile(ns, file);
    }

    ns.tprintf(`INFO   > Successfully pulled initial files!`);
    ns.tprintf(`INFO   > Running download script...`);

    await ns.sleep(250);
    ns.run(params.pullFiles.destFile);
}
