# TL;DR

```
wget "https://raw.githubusercontent.com/HtheChemist/BitBurnerCentralManager/master/build/Orchestrator/utils/initRepo.js" /Orchestrator/utils/initRepo.ns
run /Orchestrator/utils/initRepo.ns
run /Orchestrator/Boot.ns
```

# Installation from local file

The base template is from https://github.com/Naliwe/bitBurnerTsProject

## Requirements

    npm: The Node Package Manager
        It's recommended to use a version manager like nvm
        Alternatively, you can just use Node
    A bash-capable environment. This has been tested on debian, WSL, and git-bash
    tsc: The TypeScript compiler

## Quickstart

    In Git Bash or bash
        clone / fork the repo. You can also click Use as template in GitHub to create a repo form this one
        run npm install
        run npm run build
        run npm run webserver
    Go to the game
        wget http://localhost:9182/Orchestrator/utils/initRepo.ns /Orchestrator/utils/initRepo.ns
        run /Orchestrator/utils/initRepo.ns
        run /Orchestrator/Boot.ns


# What?

I made a prototype hack manager that try to optimize the available thread over all hacked server and proceed with the most efficient hacks based on their value per second. You can find the scripts here: https://github.com/HtheChemist/BitBurnerCentralManager

It is still quite buggy, ugly and unoptimized. Not sure if this is high or low, I am still pretty early in the game.

## How?

The system is split in 3 parts:

- The Managers: These scripts are looping and communicating between themselves to manage different parts of the state: the targets, the thread, the hacks and the servers.
- The Conductors: These are instance of a hack, they manage the start, steps and end of a hack.
- The Scripts: These are the basic hack/grow/weaken part. They are run with a calculated (almost) optimal amount of threads.

The managers are run on home, and require 24.20 GiB on home or a managing to fully run or 14.45 GiB if ServerManager is ignored. They will spawn one Conductor per target found. The Conductors can be run on home or another server, each instance require around 4 GiB or ram. Each Conductor will then spawn multiple grow/weaken/hack scripts on multiple host with different amount of threads. The Hacking and Managing server can be edited in the config file.

Here are more details about each script:

### TargetManager.js - 4.55 GiB *Required*

This script loop every minutes to try to find new target. It scan each host, starting from the "home" host, or the host on which it run, check if it can be hacked, hack it, and copy the scripts and their requirements on the host. Then it drill down until it can't hack anything anymore. Everytime it finds a new host, it send a message to ThreadManager and HackManager with the new host.

### ThreadManager.js - 2.15 GiB *Required*

This script build an array with all available "threads" for all hacked host. Threads are calculated based on the largest hack/grow/weaken script (which currently stand at 1.75 GiB). It then listen on a port for thread request, when a script require a certain amount of thread it allocate them and send an answer stating how many thread are available on each host, once the threads are not used anymore, it also de-allocate them so they can be re-used.

### HackManager.js - 6.10 GiB *Required*

This script loop through all hacked host and calculate for each of them two kind of hack, a full and a quick one. It then calculate how many thread and time would be required for:

- Growing the server to its max value, weakening its security to its min value and hacking it for 50% of it's max value in the case of a full hack

- Hacking it for 50% of its current value in the case of a quick hack.

These can be expanded by the addition of different algorithm.

Once it has all these value, it divide the expected value by the required time, and order them from the highest to lowest value.

These calculation are updated periodically, and consider what hack are currently in progress.

It then ask the ThreadManager for the amount of available threads, and if there are enough available, spawn an HackClass on the selected server, else it skip to the next one.

Afterward it listen for any update from the Hack, and when it is finished it start another one. The number of concurrent hack is limited by the amount of RAM on the server running the HackClasses.

### ServerManager.ns - 9.80 GiB *Optional*

This script is facultative and simply update periodically the bought server, once all 25 servers are bought it will try to update them with more RAM.

### grow.ns/weaken.ns/hack.ns - 1.75 GiB *Required*

The simple script simply grow/weaken/hack and send a signal when they are done.

### Boot.ns - 1.6 GiB *Optional*

This scripts simply start all other script. Can be run with the 'no-server-manager' argument to skip booting the ServerManager.

## Why

[Deprecated]

## What's next

We'll see
