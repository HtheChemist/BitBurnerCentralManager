export enum Channel {
    messageManager = 1, // Message Manager Port
    threadManager = 2, // Thread Manager Port
    serverManager = 3, // Server Manager Port
    hackManager = 4, // Hack Manager Port
    targetManager = 5, // Target Manager Port
    hackClass = 6, // Hack Port
    hackScript = 8, // Script Port
}

export enum ChannelName {
    messageManager = "messageManager",
    threadManager = "threadManager",
    serverManager = "serverManager",
    hackManager = "hackManager",
    targetManager = "targetManager",
    hackClass = "hackClass",
    hackScript = "hackScript"
}

export enum Action {
    // Thread Manager Actions
    threads = "threads",
    threadsAvailable = "threadsAvailable",
    getThreads = "getThreads",
    getThreadsAvailable = "getThreadsAvailable",
    freeThreads = "freeThreads",

    // Hack Manager Actions
    hackDone = "hackDone",
    hackRead = "hackRead",
    hackScriptDone = "hackScriptDone",
    weakenScriptDone = "weakenScriptDone",
    growScriptDone = "growScriptDone",

    // Target Manager Actions
    addHost = "addHost",
}