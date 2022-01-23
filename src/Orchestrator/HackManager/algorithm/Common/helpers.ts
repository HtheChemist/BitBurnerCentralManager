import {USE_LOGISTIC_PROBABILITY} from "/Orchestrator/Config/Config";

export interface IThreadRatio {
    weakenThreads: number;
    growThreads: number;
}

export function helpers(availableThreads: number, currentSecurity: number, minSecurity: number, growThreads: number, weakenThreads: number): IThreadRatio {
    if ((growThreads + weakenThreads) <= availableThreads) {
        return {weakenThreads: weakenThreads, growThreads: growThreads}
    }

    const threadsForMinSecurity = (currentSecurity - minSecurity) / 0.05
    const threadsLeft = availableThreads - threadsForMinSecurity
    if (threadsForMinSecurity >= availableThreads) {
        return {weakenThreads: availableThreads, growThreads: 0}
    }

    const calcWeakenThreads = Math.round(Math.ceil(threadsLeft / 13.5))
    const calcGrowThreads = Math.round(Math.ceil(threadsLeft - weakenThreads))

    if (calcGrowThreads < 0) {
        return {weakenThreads: availableThreads, growThreads: 0}
    }

    return {weakenThreads: calcWeakenThreads + threadsForMinSecurity, growThreads: calcGrowThreads}
}

export function calculateProbabilty(hackChance: number): number {
    if (!USE_LOGISTIC_PROBABILITY) {
        return  hackChance
    }
    return  Math.log10(hackChance / (1 - hackChance + Number.EPSILON))

}