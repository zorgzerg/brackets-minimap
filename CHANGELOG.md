# Changelog

## 3.2.2 ()
* ADD: Change the width of the minimap, pulling the left edge
* BUGFIX: Renamed MiniMap.js to Minimap.js. This made it difficult to start the extension in OS with case sensitivity of filenames
* BUGFIX: Some little CSS bugs

## 3.2.1 (11/03/2015)
* BUGFIX: Minimap does not cover the status bar and bottom panels headlines now
* BUGFIX: Minimap hide when switching to a blank panel now
* BUGFIX: Scrolling speed is calculated proportional to the displacement of the document

## 3.2.0 (11/03/2015)
* ADD: Smooth scrolling when you click on the minimap
* ADD: Scrollback when you click on the minimap with CTRL-key, and then release. When moving slider too.
* ADD: Support overscroll (with brakets option "scrollPastEnd": true)
* ADD: Highlight folded blocks
* BUGFIX: Remove unnecessary recalc/redraw scroller
* BUGFIX: Clicable invisible tooltip
* Improve performance. Brackets with large files is working well now
* Full code refactoring

## 3.1.8 (02/03/2015)
* ADD: Adjusting minimap top position. Just click on top minimap bar (not on slider ;)

## 3.1.7 (01/03/2015)
* ADD: Support Online tracking by Alex Bardanov (dnbard)
* ADD: Smooth scroll on mouse wheel over minimap. Scrolling speed is reduced by 4 times
* BUGFIX: Some little CSS bugs

## 3.1.6 (28/02/2015)
* ADD: "What's new" tooltip
* ADD: Switch autohide mode of minimap, on double click at slider
* BUGFIX: Slider not "jump" on click now
* BUGFIX: Lost mouse events

## 3.1.5 (25/02/2015)
* Some litle bugfix
* ADD: Support Code Folding extension

## 3.1.4 (25/02/2015)
* ADD: FadeIn/FadeOut effect on show/hide minimap

## 3.1.3 (24/02/2015)
* Remove "debug spam" in console

## 3.1.2 (24/02/2015)
* BUGFIX: Remove 30px margin from minimap bar

## 3.1.1 (23/02/2015)
* BUGFIX: Show/hide scrollbar
* BUGFIX: Lost onScroll listeners

## 3.1.0 (22/02/2015)
* Full code refactoring
* Plain text mode is removing: excessive feature
* ADD: minimap is overlay now
* ADD: minimap width scaling proportional to the width of the editor
* ADD: Split view support
* BUGFIX: Theme support work is right

## 3.0.1 (18/02/2015)
* Fixed minimap scroller calculate 

## 3.0.0 (17/02/2015)
* Release 3.0.0.
