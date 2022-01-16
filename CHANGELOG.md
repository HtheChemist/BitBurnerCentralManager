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

