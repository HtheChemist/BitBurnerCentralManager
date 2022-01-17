#2021-01-16

##Fixed

- Private server are now properly registering on boot
- Hack should now start even if the amount of available threads is very low

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
  - There is no more QuickHack and FullHack, now it is separated in two: Grow/Weaken and Hack
  - For Grow/Weaken, the hack value is determined on the potential revenue following a hack one the cycle is finished. This takes into account the amount of available threads.
  - For Hack, the hack value is determined by the actual value of the server.
  - Both type are weighted by the hack success chance.
  - In theory, the Grow/Weaken script would be preferred to the Hack script until the server are almost at max money, after which the hack would be prefered. 
  - Concretely, this make the script slower to start but with a higher cruising speed and giving more XP.
- The selection algorithm and conductor are now separated.

##Added

- Changelog

