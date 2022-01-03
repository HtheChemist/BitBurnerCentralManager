**TL;DR**

```
wget "https://raw.githubusercontent.com/HtheChemist/BitBurnerCentralManager/master/initDownload.js" install.js
run install.js
```

**What?**

I made a prototype hack manager that try to optimize the available thread over all hacked server and proceed with the most efficient hacks based on their value per second. You can find the scripts here: https://github.com/HtheChemist/BitBurnerCentralManager

It is still quite buggy, ugly and unoptimized, it currently gives me around 500M/seconds. Not sure if this is high or low, I am still pretty early in the game.

**How?**

The system is split in 3 parts:

- The Managers: These scripts are looping and communicating between themselves to manage different parts of the state: the targets, the thread, the hacks and the servers.
- The Hacks: These are instance of an hack, they manage the start, steps and end of a hack.
- The Scripts: These are the basic hack/grow/weaken part. They are ran with a calculated (almost) optimal amount of threads.

The managers are ran on home, and require 10.70 GiB on home (or at least on the same server), they will spawn one Hack per target. The Hacks can be run on home or another server, each instance require 5.40 GiB or ram. Each Hack will then spawn multiple grow/weaken/hack scripts on multiple host with different amount of threads.

Here are more details about each scripts:

*TargetManager.js*

This script loop every minutes to try to find new target. It scan each host, starting from the "home" host, or the host on which it run, check if it can be hacked, hack it, and copy the scripts and their requirements on the host. Then it drill down until it can't hack anything anymore. Everytime it finds a new host, it send a message to ThreadManager and HackManager with the new host.

*ThreadManager.js*

This script build an array with all available "threads" for all hacked host. Threads are calculated based on the largest hack/grow/weaken script (which currently stand at 1.75 GiB). It then listen on a port for thread request, when a script require a certain amount of thread it allocate them and send an answer stating how many thread are available on each host, once the threads are not used anymore, it also de-allocate them so they can be re-used.

*HackManager.js*

This script loop through all hacked host and calculate for each of them two kind of hack, a full and a quick one. It then calculate how many thread and time would be required for:

- Growing the server to its max value, weakening its security to its min value and hacking it for 50% of it's max value in the case of a full hack

- Hacking it for 50% of its current value in the case of a quick hack.

Once it has all these value, it divide the expected value by the required time, and order them from the highest to lowest value.

These calculation are updated periodically, and consider what hack are currently in progress.

It then ask the ThreadManager for the amount of available threads, and if there are enough available, spawn an HackClass on the selected server, else it skip to the next one.

Afterward it listen for any update from the Hack, and when it is finished it start another one. The number of concurrent hack is limited by the amount of RAM on the server running the HackClasses.

*HackClass.js*

This script receive the hack information. It then ask the ThreadManager for the required amount of threads and spawn one of multiple instance of the scripts with the available threads on one or multiple host. It check when the scripts are finished running and stagger them in the case of a grow/weaken/hack cycle so the hack start when the grow/weaken are finished. Once the scripts are finished, it release the threads and signal the HackManager that it has finished.

*ServerManager.js*

This script is facultative and simply update periodically the bought server, once all 25 servers are bought it will try to update them with more RAM.

*Boot.js*

This scripts simply start all other script and prepare the server that will run the HackClasses

*grow.js/weaken.js/hack.js*

The simple script simply grow/weaken/hack and send a signal when they are done.

*Message.js*

Common message function. Also contains the port definition. Eventually I would probably like to make a MessageManager that would centralize all messages request and ease communication between the Managers, especially regarding the options to Pause the script so the HackClass server can be updated, or the Threads/TargetManager be reset.

*Constants.js*

Some constants and configs.

**Why**

[Deprecated]

**What's next**

I may or may not convert it to TypeScript, do some cleanup and bug fixing.
