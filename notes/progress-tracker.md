20251020:
- Prototype bounding box for resize visualisation (using rects only)

20251021:
- Present at the Project Festival
- Add image pasting function

20251022:
- Add bounding box and manager class
- Add event listener to detect bounding box and update cursor to reflect interaction
- Extract screenToWorld function to utils

20251023:
- Add ability to turn off corners when selection becomes passive
- add multi select border box

20251024:
- fix width and height calculation of border box - will need to revisit to decide a better way to calculate it

20251026:
- there is no specific reason to separate bounding box hit test from handle to body
- prioritise handle due to hit margin
- refact multibounding box and bounding box
- bounding boxes are now moved on pointer drag and move

20251028:
- Fix multibounding box problem that have inconsistent movement (due to not using set of targets)
- Add world matrix reference to enable bounding box reaction to camera movement