// export enum Channel {
//     messageManager = 1, // Message Manager Port [DEPRECATED]
//     threadManager = 2, // Thread Manager Port
//     serverManager = 3, // Server Manager Port
//     hackManager = 4, // Hack Manager Port
//     targetManager = 5, // Target Manager Port
//     hackConductor = 6, // Hack Port
//     hackScript = 8, // Script Port
//     consoleLink = 9, // Console Port
//     bootScript = 10, // Boot Script
//     communication_1 = 16, // General communication
//     communication_2 = 17,
//     communication_3 = 18,
//     communication_4 = 19,
//     communication_5 = 20
// }
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
    ChannelName["shareScript"] = "shareScript";
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
    Action["useShareSwitch"] = "useShareSwitch";
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
    Action["clearMyMessage"] = "clearMyMessage";
})(Action || (Action = {}));
