export var Channel;
(function (Channel) {
    Channel[Channel["messageManager"] = 1] = "messageManager";
    Channel[Channel["threadManager"] = 2] = "threadManager";
    Channel[Channel["serverManager"] = 3] = "serverManager";
    Channel[Channel["hackManager"] = 4] = "hackManager";
    Channel[Channel["targetManager"] = 5] = "targetManager";
    Channel[Channel["hackConductor"] = 6] = "hackConductor";
    Channel[Channel["hackScript"] = 8] = "hackScript";
    Channel[Channel["consoleLink"] = 9] = "consoleLink";
    Channel[Channel["bootScript"] = 10] = "bootScript"; // Boot Script
})(Channel || (Channel = {}));
export var ChannelName;
(function (ChannelName) {
    ChannelName["messageManager"] = "messageManager";
    ChannelName["threadManager"] = "threadManager";
    ChannelName["serverManager"] = "serverManager";
    ChannelName["hackManager"] = "hackManager";
    ChannelName["targetManager"] = "targetManager";
    ChannelName["hackConductor"] = "hackConductor";
    ChannelName["hackScript"] = "hackScript";
    ChannelName["consoleLink"] = "consoleLink";
    ChannelName["bootScript"] = "bootScript";
})(ChannelName || (ChannelName = {}));
export var Action;
(function (Action) {
    // Thread Manager Actions
    Action["threads"] = "threads";
    Action["threadsAvailable"] = "threadsAvailable";
    Action["getThreads"] = "getThreads";
    Action["getThreadsAvailable"] = "getThreadsAvailable";
    Action["freeThreads"] = "freeThreads";
    Action["updateHost"] = "updateHost";
    Action["consoleThreadsUse"] = "consoleThreadsUse";
    Action["lockHost"] = "lockHost";
    Action["hostLocked"] = "hostLocked";
    Action["getTotalThreads"] = "getTotalThreads";
    Action["totalThreads"] = "totalThreads";
    // Hack Manager Actions
    Action["hackDone"] = "hackDone";
    Action["hackReady"] = "hackRead";
    Action["hackScriptDone"] = "hackScriptDone";
    Action["weakenScriptDone"] = "weakenScriptDone";
    Action["growScriptDone"] = "growScriptDone";
    Action["hackPaused"] = "hackPaused";
    Action["hackResume"] = "hackResume";
    Action["printHacks"] = "printHacks";
    Action["printRunningHacks"] = "printRunningHacks";
    Action["switchHackMode"] = "switchHackMode";
    // Target Manager Actions
    Action["addHost"] = "addHost";
    Action["getHostList"] = "getHostList";
    // General Actions
    Action["stop"] = "stop";
    Action["pause"] = "pause";
    Action["kill"] = "kill";
    Action["resume"] = "resume";
    Action["messageRequest"] = "messageRequest";
    Action["noMessage"] = "noMessage";
    // Message Manager Actions
    Action["dumpQueue"] = "dumpQueue";
})(Action || (Action = {}));
