export enum Channel {
    messageManager = 1, // Message Manager Port
    threadManager = 2, // Thread Manager Port
    serverManager = 3, // Server Manager Port
    hackManager = 4, // Hack Manager Port
    targetManager = 5, // Target Manager Port
    hackConductor = 6, // Hack Port
    hackScript = 8, // Script Port
    consoleLink = 9 // Console Port
}

export enum ChannelName {
    messageManager = "messageManager",
    threadManager = "threadManager",
    serverManager = "serverManager",
    hackManager = "hackManager",
    targetManager = "targetManager",
    hackConductor = "hackConductor",
    hackScript = "hackScript",
    consoleLink = "consoleLink",
}

export enum Action {
    // Thread Manager Actions
    threads = "threads",
    threadsAvailable = "threadsAvailable",
    getThreads = "getThreads",
    getThreadsAvailable = "getThreadsAvailable",
    freeThreads = "freeThreads",
    updateHost = "updateHost",
    consoleThreadsUse = "consoleThreadsUse",

    // Hack Manager Actions
    hackDone = "hackDone",
    hackReady = "hackRead",
    hackScriptDone = "hackScriptDone",
    weakenScriptDone = "weakenScriptDone",
    growScriptDone = "growScriptDone",
    hackPaused = "hackPaused",
    hackResume = "hackResume",

    // Target Manager Actions
    addHost = "addHost",
    getHostList = "getHostList",


    // General Actions
    stop = "stop",
    pause = "pause",
    kill = "kill",
    resume = "resume",
    messageRequest = "messageRequest",
    noMessage = "noMessage",

    // Message Manager Actions
    dumpQueue = "dumpQueue"
}