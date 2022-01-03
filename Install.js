/** @param {NS} ns **/
export async function main(ns) {
	const usrDirectory = "/CentralManager/";
	if (ns.getHostname() !== "home") {
		throw new Exception("Run the script from home");
	}

	var githubURL = "https://raw.githubusercontent.com/HtheChemist/BitBurnerCentralManager/master/initDownload.js";
	var outputFileName = usrDirectory + "initDownload.js";

	await ns.wget(githubURL, outputFileName);
	ns.run(outputFileName, 1);
}