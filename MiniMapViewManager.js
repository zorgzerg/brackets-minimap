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

/*global console, define, brackets, Mustache, $, parseInt, setInterval, clearInterval */
/*jslint nomen: true, vars: true */
define(function (require, exports, module) {
    'use strict';

    var
        EditorManger  = brackets.getModule("editor/EditorManager"),

        tmplMinimap  = require("text!html/minimap.html"),

        renderedMinimap = null,

        onDrag = false,
        resizeMinimapInterval = null,

        minimapWidth = 0,
        minimapHeight = 0,
        editorHeight = 0;

    function getHolder() {
        return $("#editor-holder");
    }

    function getMinimap() {
        return $("#minimap-wrapper");
    }

    function getMinicode() {
        return $("#minimap-content");
    }

    function getSlider() {
        return $("#minimap-slider");
    }

    function getCurrentEditor() {
        return EditorManger.getCurrentFullEditor();
    }

    function renderMinimap() {
        var view = $(Mustache.render(tmplMinimap));
        return view;
    }

    function scrollUpdate() {
		var
            slider = getSlider(),
            minicode = getMinicode(),
            currentEditor = getCurrentEditor(),

            editorHeight = $(currentEditor.getRootElement()).height(),
            minicodeHeight = minicode.height() / 4,
            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),
            minimapHeight = getMinimap().height(),
            scrollbarHeight = Math.min(minimapHeight, minicodeHeight),

            // Calculate slider height
            sliderHeight = Math.floor(editorHeight * minicodeHeight / codeHeight);

        // Set slider height
        slider.css("height", sliderHeight + "px");

        // slider moving
        slider.css("top", Math.floor(currentEditor.getScrollPos().y * (scrollbarHeight - sliderHeight) / (codeHeight - editorHeight)));

        // Slide minicode block
        if (minicodeHeight > minimapHeight) {
            var scrollPercent = (minicodeHeight - minimapHeight) / (codeHeight - editorHeight);
            var scrollPos = -currentEditor.getScrollPos().y * scrollPercent;
            minicode.css("top", Math.floor(scrollPos) + "px");
        } else {
            minicode.css("top", "0px");
        }
	}

    function resizeMinimap() {
        var
            minimap = getMinimap(),
            minicode = getMinicode(),
            holder = getHolder(),
            currentEditor = EditorManger.getCurrentFullEditor(),
            trigger = false;

        if (currentEditor) {
            var width = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").width();
            if (minimapWidth !== width) {
                minimapWidth = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").width();
                minicode.css("width", minimapWidth);
                minimap.css("width", minimapWidth / 4);
                trigger = true;
            }

            var height = holder.height();
            if (minimapHeight !== height) {
                minimapHeight = height;
                minimap.css("height", minimapHeight + "px");
                trigger = true;
            }

            height = $(currentEditor.getRootElement()).height();
            if (editorHeight !== height) {
                editorHeight = height;
                trigger = true;
            }

            if (trigger) {
                scrollUpdate();
            }
        }
    }

    function scrollTo(y) {
        var
            sliderHeight = getSlider().height(),
            minicode = getMinicode(),

            currentEditor = EditorManger.getCurrentFullEditor(),

            minicodHeight = minicode.height(),
            scrollbarHeight = Math.min(getMinimap().height(), minicodHeight / 4),

            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),
            editorHeight = $(currentEditor.getRootElement()).height(),

            adjustedY = y - sliderHeight / 2;

        adjustedY *= (codeHeight - editorHeight)  / (scrollbarHeight - sliderHeight);
        currentEditor.setScrollPos(currentEditor.getScrollPos.x, Math.floor(adjustedY));
	}

    function setScrollerListeners() {
        getMinimap().on("mousedown", function (e) {
            if (e.button === 0) {
                onDrag = true;
                $(this).addClass("minimap-ondrag");
                scrollTo(e.pageY);
            }
        });

        $(document).on("mousemove", function (e) {
            if (onDrag) {
                scrollTo(e.pageY);
                e.stopPropagation();
            }
        });

        $(document).on("mouseup", function () {
            onDrag = false;
            getMinimap().removeClass("minimap-ondrag");
        });
    }

    function clearScrollerListeners() {
        getMinimap().off("mousedown");
        $(document).off("mousemove");
        $(document).off("mouseup");
    }

    function showMinimap() {
        getMinimap().show();

        if (resizeMinimapInterval !== null) {
            clearInterval(resizeMinimapInterval);
        }

        resizeMinimapInterval = setInterval(function () {
            resizeMinimap();
		}, 100);

        $("#editor-holder .CodeMirror-vscrollbar").addClass("minimap-scrollbar-hide");

        setScrollerListeners();
    }

    function hideMinimap() {
        getMinimap().hide();
        clearInterval(resizeMinimapInterval);
        $("#editor-holder .CodeMirror-vscrollbar").removeClass("minimap-scrollbar-hide");
        clearScrollerListeners();
    }

    function attachMinimap() {
        getHolder().append(renderedMinimap);
    }

    function init() {
        renderedMinimap = renderMinimap();
        attachMinimap();
    }

    exports.init = init;
    exports.getMinimap = getMinimap;
    exports.resizeMinimap = resizeMinimap;
    exports.getSlider = getSlider;
    exports.getHolder = getHolder;
    exports.getMinimap = getMinimap;
    exports.getMinicode = getMinicode;
    exports.getCurrentEditor = getCurrentEditor;

    exports.showMinimap = showMinimap;
    exports.hideMinimap = hideMinimap;
    exports.scrollUpdate = scrollUpdate;
});
