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
 */

/*global define, brackets, $, console, setTimeout */
/*jslint nomen: true, vars: true */
define(function (require, exports, module) {
    'use strict';

    var
        MainViewManager = brackets.getModule("view/MainViewManager"),
        Editor  = brackets.getModule("editor/Editor"),
        PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
        ViewManager = require("MiniMapViewManager"),
        MinimapMenus = require('MinimapMenus'),
        Config = require('Config'),

        currentScrolledEditor = null,
        miniCode = null,

        Prefs = PreferencesManager.getExtensionPrefs(Config.NAME);

    function loadMinimap(document, minimap) {
        if (document !== null && minimap !== undefined) {
            if (miniCode === null || document !== miniCode.document) {
                ViewManager.showMinimap();

                if (miniCode !== null) {
                    miniCode.destroy();
                }

                miniCode = new Editor.Editor(document, false, minimap.find("#minimap-content").get(0));
                console.info(miniCode.getRootElement());
                ViewManager.scrollUpdate();
            }
        } else if (document === null) {
            ViewManager.disable();

            if (miniCode !== null) {
                miniCode.destroy();
                miniCode = null;
                console.info("miniCode.destroy()");
            }
        } else {
            console.error("Cannot refresh minimap, document or minimap do not exist");
        }
    }

    function reloadMinimap() {
        var minimap = ViewManager.getMinimap();
        if (minimap !== null && minimap !== undefined) {
            var currentEditor = ViewManager.getCurrentEditor();

            if (currentEditor !== null) {
                loadMinimap(currentEditor.document, minimap);
            } else {
                console.error("Full editor does not exist!");
                loadMinimap(null, undefined);
            }
        } else {
            console.error("Minimap  does not exist");
        }
    }

    function enableMinimap() {
        if (currentScrolledEditor !== null) {
            currentScrolledEditor.off("scroll");
        }

        ViewManager.showMinimap();

        currentScrolledEditor = ViewManager.getCurrentEditor();

        currentScrolledEditor.on("scroll", function () {
            ViewManager.scrollUpdate();
            console.info("MiniMap.enableMinimap().onScroll");
        });

        reloadMinimap();
        ViewManager.resizeMinimap();


    }

    function disableMinimap() {
        if (currentScrolledEditor !== null) {
            currentScrolledEditor.off("scroll");
        }

        ViewManager.hideMinimap();
    }

    function toggleMinimap() {
        if (Prefs.get("enabled")) {
            enableMinimap();
        } else {
            disableMinimap();
        }
    }

    function init() {
        Prefs.definePreference("enabled", "boolean", true);
        MinimapMenus.init();
        ViewManager.init();

        Prefs.on("change", function () {
            toggleMinimap();
        });

        MainViewManager.on("currentFileChange", function (e, newFile, newPaneId, oldFile, oldPaneId) {
            if (Prefs.get("enabled")) {
                if (newFile !== null) {
                    enableMinimap();
                } else {
                    disableMinimap();
                }
            }


        });
    }

    exports.init = init;
});
