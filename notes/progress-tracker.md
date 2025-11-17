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

20251109:
- Create web component

20251110:
- Adapt mobx as state management library
- Migrated camera and pointer manager states to mobx

20251111:
- Create renderable state
- Update the affected code
- create history tracking
- basic command pattern
- create resize command to test
- add basic key event detection to undo resize event
- use gpt to template a serializer for data export

20251112:
- Update resize command to transform command since it works for translation too
- Add scene command for canvas children control (add child, remove child - individual and bulk)
- Add delete button listener to remove children
- Delegate selection deletion to selection manager (which seems appropriate to me)
- Add file upload to add images to canvas

20251113:
- Update file upload position to add to center of the canvas no matter where we are
- Create basic version of serializer
- Add export and import canvas as json file
- Add clear canvas API
- Copy files from selection
    - due to the navigator.clipboard write API being new, it is not currently possible to copy multiple files
    - Resort to possibly combining multiple images into a single image to at least keep the images together

20251114:
- Add image import in jpg and webp format
- fix marquee bug
- merge images together with canvas to allow copying multiple images

20251115:
- Add context menu options class and its styling
- Add copy image and its wrapper to ensure that context menu is cleared

20251116:
- Refactor functions
- Add deleted and paste image function to the context menu option
- Add flipping vertical and horizontal action (had trouble with multi bounding box's x and y coordinate due to it being screen space instead)