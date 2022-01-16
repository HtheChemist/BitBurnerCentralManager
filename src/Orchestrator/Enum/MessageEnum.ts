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
    threads = "threads",  // Threads list
    threadsAvailable = "threadsAvailable",  // The number of available threads
    getThreads = "getThreads",  // Get some threads
    getThreadsAvailable = "getThreadsAvailable",  // Get the total number of threads
    freeThreads = "freeThreads",  // Free the threads
    updateHost = "updateHost",  // Update a host
    consoleThreadsUse = "consoleThreadsUse",  // Console command to print the current threads use
    lockHost = "lockHost",  // To indicate a host lock request (preparing for update)
    hostLocked = "hostLocked",  // To indicate that a host is locked (no threads are in use)
    getTotalThreads = "getTotalThreads", // To get the total amount of threads available
    totalThreads = "totalThreads", // Total amount of threads

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