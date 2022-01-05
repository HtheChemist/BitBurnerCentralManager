/** @param {NS} ns **/
const scriptToLaunch = 'Boot.js';
const scriptToLaunchThreads = 1;
const launchScript = true;
const usrDirectory = "";
const scVersion = 1.00;

const baseUrl = 'https://raw.githubusercontent.com/HtheChemist/BitBurnerCentralManager/master/'
const filesToDownload = [
  'Boot.js',
  'Constants.js',
  'HackClass.js',
  'HackManager.js',
  'Message.js',
  'ServerManager.js',
  'TargetManager.js',
  'ThreadManager.js',
  'MessageManager.js',
  'grow.js',
  'hack.js',
  'weaken.js',
]
const valuesToRemove = ['BB_SERVER_MAP'];

function localeHHMMSS(ms = 0) {
  if (!ms) {
    ms = new Date().getTime();
  }

  return new Date(ms).toLocaleTimeString();
}

export async function main(ns) {
  if (launchScript) ns.tprint(`[${localeHHMMSS()}] Starting ` + scriptToLaunch);

  let hostname = ns.getHostname();

  if (hostname !== 'home') {
    throw new Exception('Run the script from home')
  }

  ns.toast("Welcome to Chemist Scripts!")
  ns.tprint("Getting started with the scripts. Please wait while we download."
    + "\n Version: " + scVersion
    + "\n Quick start information:"
    + "\n run /CentralManager/Boot.js"
    + "\n"
  );

  for (let i = 0; i < filesToDownload.length; i++) {
    const filename = filesToDownload[i]
    const path = baseUrl + filename
    await ns.scriptKill(filename, 'home');
    await ns.rm(filename);
    await ns.sleep(200);
    ns.tprint(`[${localeHHMMSS()}] Trying to download ${path}`);
    await ns.wget(path + '?ts=' + new Date().getTime(), usrDirectory + filename);
  }

  valuesToRemove.map((value) => localStorage.removeItem(value));

  if (launchScript) {
    ns.tprint(`[${localeHHMMSS()}] Spawning ` + usrDirectory + scriptToLaunch);
    ns.run(usrDirectory + scriptToLaunch, scriptToLaunchThreads);
  }
}