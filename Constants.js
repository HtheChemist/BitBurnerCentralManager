export const hackingScripts = {
	hack: "hack.js",
	weaken: "weaken.js",
	grow: "grow.js"
}

export const requiredImport = [
	'Message.js',
]

export const hackOriginServer = "home"

export const hackClassScript = "HackClass.js"

export const hackOriginServerImport = [
	hackClassScript,
	'Constants.js',
	...requiredImport
]

export const initialRamAmount = 8

export const xpFarm = false