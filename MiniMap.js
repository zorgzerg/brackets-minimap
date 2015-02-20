/*
 * Copyright (c) 2015 Senko Anton. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*global define, brackets, $, console, setTimeout */
/*jslint nomen: true, vars: true */
define(function (require, exports, module) {
    'use strict';

    var
        DocumentManager = brackets.getModule("document/DocumentManager"),
        MainViewManager = brackets.getModule("view/MainViewManager"),
        EditorManger  = brackets.getModule("editor/EditorManager"),
        Editor  = brackets.getModule("editor/Editor"),
        ViewManager = require("MiniMapViewManager"),

        miniCode = null;

    function getCurrentFullEditor() {
        return EditorManger.getCurrentFullEditor();
    }

    function loadMinimap(document, minimap) {
        if (document !== null && minimap !== undefined) {
            if (miniCode === null || document !== miniCode.document) {

                if (miniCode !== null) {
                    miniCode.destroy();
                }

                miniCode = new Editor.Editor(document, false, minimap.find("#minimap-content").get(0));
                ViewManager.enable();
            }
        } else if (document === null) {
            ViewManager.disable();

            if (miniCode !== null) {
                miniCode.destroy();
                miniCode = null;
            }
        } else {
            console.error("Cannot refresh minimap, document or minimap do not exist");
        }
    }

    function reloadMinimap() {
        console.log("reloadMinimap");
        var minimap = ViewManager.getMinimap();

        if (minimap !== null && minimap !== undefined) {
            var fullEditor = getCurrentFullEditor();

            if (fullEditor !== null) {
                loadMinimap(fullEditor.document, minimap);
            } else {
                console.error("Full editor does not exist!");
                loadMinimap(null, undefined);
            }
        } else {
            console.error("Minimap  does not exist");
        }
    }

    function setViewManagerListeners() {
        $(ViewManager).on("MinimapAttached", function () {
            if (getCurrentFullEditor() !== null) {
                ViewManager.enable();
            }
        });

        $(ViewManager).on("MinimapVisible", function () {
            reloadMinimap();
//            ViewManager.scrollUpdate();
        });

        $(ViewManager).on("MinimapHidden", function () {
            miniCode.destroy();
            miniCode = null;
        });
    }

    function setMainViewManagerListeners() {
        MainViewManager.on("currentFileChange", function () {
            console.log("event - currentFileChange");
            if (miniCode !== null) {
                reloadMinimap();
                ViewManager.scrollUpdate();
            } else {
                ViewManager.enable();
                ViewManager.toggleMinimap();
            }

            getCurrentFullEditor().on("scroll", function() {
                ViewManager.scrollUpdate();
            })
        });
    }

    function init() {
        setMainViewManagerListeners();
        setViewManagerListeners();

        ViewManager.init();
    }

    exports.init = init;
});

