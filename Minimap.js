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
        EditorManger  = brackets.getModule("editor/EditorManager"),
        PreferencesManager = brackets.getModule('preferences/PreferencesManager'),

        ViewManager = require("MiniMapViewManager"),
        MinimapMenus = require('MinimapMenus'),
        Config = require('Config'),
        Prefs = PreferencesManager.getExtensionPrefs(Config.NAME),
        Tooltip = require('MinimapTooltip');

    function onScroll() {
        ViewManager.scrollUpdate();
    }

    function onDocumentChange(e, doc, changeList) {
        ViewManager.change(doc, changeList);
    }

    function setEditorListeners(editor) {
        if (editor) {
            editor.on("scroll.minimap", onScroll);
            editor.document.on("change", onDocumentChange);
        }
    }

    function clearEditorListeners(editor) {
        if (editor) {
            editor.off("scroll.minimap", onScroll);
            editor.document.off("change", onDocumentChange);
        }
    }

    function onActiveEditorChange(e, editorGainingFocus, editorLosingFocus) {
        clearEditorListeners(editorLosingFocus);

        ViewManager.update(editorGainingFocus);
        setEditorListeners(editorGainingFocus);
    }

    function enable() {
        var
            editor = EditorManger.getCurrentFullEditor();

        EditorManger.on("activeEditorChange", onActiveEditorChange);
        ViewManager.show(editor);

        setTimeout(function () {
            Tooltip.show();
        }, 2000);
    }

    function disable() {
        var
            editor = EditorManger.getCurrentFullEditor();

        EditorManger.off("activeEditorChange", onActiveEditorChange);
        editor.off("scroll.minimap", onScroll);
        ViewManager.hide();
    }

    function init() {
        Prefs.definePreference("enabled", "boolean", true);
        MinimapMenus.init();
        ViewManager.init();

        if (Prefs.get("enabled")) {
            enable();
        }

        Prefs.on("change", function (e, data) {
            if (data.ids[0] === "enabled") {
                if (Prefs.get("enabled")) {
                    enable();
                    setEditorListeners(EditorManger.getCurrentFullEditor());
                } else {
                    disable();
                    clearEditorListeners(EditorManger.getCurrentFullEditor());
                }
            }
        });
    }

    exports.init = init;
});
