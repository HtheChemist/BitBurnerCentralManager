#2021-01-22

##Fixed

- Modified the way large amount of threads are freeds, it should not lock up anymore.
- There should be less message collision (see changed)
- HackManager and TargetManager should not get stuck anymore (see changed)

##Changed

- Completely reworked the way message work. They now use random channels so large amount of scripts finishing at the same time should not clog up a channel anymore.
- Conductors can now timeout if they do not receive a response in the expected time + some leeway. This should stop script from getting stucks.
  - Note: the timeout parameter also apply to general message

##Added

- The XP Conductor should be usable. You can use "console switchHackMode" to switch between hacking mode.
- Started to work on a SingularityManager for when you have access to Singularity functions. It is not ready.

#2021-01-17

##Fixed

- Freeing threads should work correctly again, I really need to remember that findIndex return -1 and not undefined when index is not found

##Changed

- Moved around the file in the repo a bit, they are now classed by application

##Added

- Added more fine-tuning regarding the location of each script, this is specially useful for new game. ThreadManager can be run on n00dles while the other run on foodnstuff with home acting as a hack originator. Sigma-cosmetics is needed though to really start the scripts.


#2021-01-16

##Fixed

- Private server are now properly registering on boot
- Class should now start even if the amount of available threads is very low

##Changed

- Reworked the algorithm, the relative value is calculated based on the expected/mesured value obtained by a thread over time weighted with the success rate
- Server Manager now tag server for update instead of requesting a full pause

##Added

- The XP hack mode is ready, this mode will repeatedly weaken the most optimal server to give XP
- The following console command were added:
  - threadUse: Show the current status of each server in the Thread Manager
  - printHacks: Print the current hack calculation result
  - printRunningHacks: Print the current running hacks
  - switchHackMode: Switch between the money hack mode and the xp hack mode


#2022-01-15

##Fixed

- Thread manager now free threads correctly, there should not be any failure to start script

##Changed

- Extracted some common function, should be easier to maintains
- Rethinked the algorithms:
  - There is no more QuickHack and FullHack, now it is separated in two: Grow/Weaken and Class
  - For Grow/Weaken, the hack value is determined on the potential revenue following a hack one the cycle is finished. This takes into account the amount of available threads.
  - For Class, the hack value is determined by the actual value of the server.
  - Both type are weighted by the hack success chance.
  - In theory, the Grow/Weaken script would be preferred to the Class script until the server are almost at max money, after which the hack would be prefered. 
  - Concretely, this make the script slower to start but with a higher cruising speed and giving more XP.
- The selection algorithm and conductor are now separated.

##Added

- Changelog

