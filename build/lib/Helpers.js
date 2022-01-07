const ReadText = {
    readLines(ns, file) {
        return ns.read(file).split(/\r?\n/);
    },
    readNonEmptyLines(ns, file) {
        return ReadText.readLines(ns, file).filter((x) => x.trim() != "");
    },
};
const DownloadFiles = {
    async getfileToHome(ns, source, dest) {
        const logger = new TermLogger(ns);
        logger.info(`Downloading ${source} -> ${dest}`);
        if (!(await ns.wget(source, dest, "home"))) {
            logger.err(`\tFailed retrieving ${source} -> ${dest}`);
        }
    },
};
class TermLogger {
    constructor(ns) {
        this.ns = ns;
    }
    info(msg, ...args) {
        this.ns.tprintf(`${TermLogger.INFO_LITERAL} ${msg}`, ...args);
    }
    warn(msg, ...args) {
        this.ns.tprintf(`${TermLogger.WARN_LITERAL} ${msg}`, ...args);
    }
    err(msg, ...args) {
        this.ns.tprintf(`${TermLogger.ERR_LITERAL} ${msg}`, ...args);
    }
    log(msg, ...args) {
        this.ns.tprintf(`${TermLogger.TRACE_LITERAL} ${msg}`, ...args);
    }
}
TermLogger.INFO_LITERAL = "INFO   >";
TermLogger.WARN_LITERAL = "WARN   >";
TermLogger.ERR_LITERAL = "ERROR  >";
TermLogger.TRACE_LITERAL = "TRACE  >";
const repoSettings = {
    baseUrl: "https://github.com/HtheChemist/BitBurnerCentralManager/blob/master/build",
    manifestPath: "/resources/manifest.txt",
};
class RepoInit {
    constructor(ns, logger = new TermLogger(ns)) {
        this.ns = ns;
        this.logger = logger;
    }
    static getSourceDestPair(line) {
        return line.startsWith("./")
            ? {
                source: `${repoSettings.baseUrl}${line.substring(1)}`,
                dest: line.substring(1),
            }
            : null;
    }
    async pullScripts() {
        await this.getManifest();
        await this.downloadAllFiles();
    }
    async getManifest() {
        const manifestUrl = `${repoSettings.baseUrl}${repoSettings.manifestPath}`;
        this.logger.info(`Getting manifest...`);
        await DownloadFiles.getfileToHome(this.ns, manifestUrl, repoSettings.manifestPath);
    }
    async downloadAllFiles() {
        const files = ReadText.readNonEmptyLines(this.ns, repoSettings.manifestPath);
        this.logger.info(`Contents of manifest:`);
        this.logger.info(`\t${files}`);
        for (let file of files) {
            const pair = RepoInit.getSourceDestPair(file);
            if (!pair) {
                this.logger.err(`Could not read line ${file}`);
            }
            else {
                await DownloadFiles.getfileToHome(this.ns, pair.source, pair.dest);
            }
        }
    }
}
export { ReadText, TermLogger, RepoInit, DownloadFiles };
