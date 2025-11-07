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
- Refactor pointer event to move pointer events control to pointer event manager (including adding and removing images from selection)

20251029:
- Fix bounding box edges and corners not showing up at the right place (visual scaling problem)
- Fix bounding box (and multi bounding box) pointer hovering issue (the problem was because the dimensions of the bounding box boxes were not scaling properly with the world matrix)
- Add resizing capability for single bounding boxes

20251031:
- Convert to using translation instead of x and y updates to record movements of the images

20251101:
- remove x and y altogether to store movement information about images/shapes through translation only (all movements are just translations from the (local) origin)

20251102:
- Fix multi bounding box bound calculation

20251103:
- Fix bounding box scaling properly. Figure out how the translation works without changing the 'direction'
- Fix bounding box corner detection and interpret the correct cursor style and also side detection

20251104:
- Work on fixing the multi bounding box range. Not quite there yet, but retrieving the values. Just need to put them into the right places

20251105:
- Bounding box range fixed after double checking that all the edges are calculated properly
- Multi bounding box resize basic works but flipping is not working yet

20251106:
- not a lot of luck fixing the bug

20251107:
- Fixed the bug with the multibounding box
- add this.scale to keep track of the direction of movement
- Unnecessary adjustment to mulSX and mulSY - should have understood that the flip ratio is only one instance when you cross the threshold and the flip will be recorded
- Fix recalculate bound method to flip for the correct image direction/width using the this.scale
- And corner adjustment for cursor changes