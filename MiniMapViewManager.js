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

/*global console, define, brackets, Mustache, $, parseInt */
/*jslint nomen: true, vars: true */
define(function (require, exports, module) {
    'use strict';

    var
        EditorManger  = brackets.getModule("editor/EditorManager"),

        tmplMinimap  = require("text!html/minimap.html"),
        tmplToolbarIcon  = require("text!html/toolbar.html"),

        renderedMinimap = null,
        renderedToolbarIcon = null,

        onDrag = false;

    function triggerEvent(event, data) {
        $(exports).triggerHandler(event, data);
    }

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

    function getToolbarIcon() {
        return $("#code-overview-icon");
    }

    function renderToolbarIcon() {
        var view = $(Mustache.render(tmplToolbarIcon));
        return view;
    }

    function renderMinimap() {
        var view = $(Mustache.render(tmplMinimap));
        return view;
    }

    function toggleMinimap() {
        var
            minimap = getMinimap(),
            icon = getToolbarIcon();

        //console.log($(EditorManger.getCurrentFullEditor().getRootElement()).find(".CodeMirror-sizer").height());
        if (minimap !== null) {
            if (minimap.is(":visible")) {
                minimap.hide();
                triggerEvent("MinimapHidden", {});
            } else if (icon.hasClass("enabled")) {
                minimap.show();
                triggerEvent("MinimapVisible", {});
            }
        }

    }

    function resizeMinimap() {
        var
            minimap = getMinimap(),
            holder = getHolder();

        minimap.css("height", holder.height() - 25 + "px");
    }

    function scrollTo(y) {
        var
            sliderHeight = getSlider().height(),
            minicode = getMinicode(),

            currentEditor = EditorManger.getCurrentFullEditor(),

            minicodHeight = minicode.height(),
            //scrollbarHeight = Math.min(getMinimap().height(), (hMiniCode + parseInt(miniCode.css('padding-top')) + parseInt(miniCode.css('padding-bottom'))) / 4 );
            scrollbarHeight = Math.min(getMinimap().height(), minicodHeight / 4),

            //codeHeight = getHolder().height(),
            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),
            //hEditor = $('#editor-holder .CodeMirror:visible .CodeMirror-scroll').height();
            editorHeight = $(currentEditor.getRootElement()).height(),

            adjustedY = y - sliderHeight / 2 - 30;

        adjustedY *= codeHeight  / (scrollbarHeight + 30 - sliderHeight / 2);
        adjustedY = Math.floor(adjustedY);

        currentEditor.setScrollPos(currentEditor.getScrollPos.x, Math.max(adjustedY, 0));
	}

    function setToolbarIconListeners() {
        $("#code-overview-icon").click(function () {
            toggleMinimap();
        });
    }

    function setScrollerListeners() {
//        $('#wdMinimap').on('mousedown.wdMinimap', mouseDown);
//        $(document).on('mouseup.wdMinimap', mouseUp);
//        $('#wdMinimap').on('mousemove.wdMinimap', mouseMove);
        getMinimap().on("mousedown", function (e) {
            if (e.button === 0) {
                onDrag = true;
                scrollTo(e.pageY);
            }
        });

        getMinimap().on("mousemove", function (e) {
            if (onDrag) {
                console.log(e.pageY);
                scrollTo(e.pageY);
                e.stopPropagation();
            }
        });

        $(document).on("mouseup", function () {
            onDrag = false;
        });
    }

    function attachMinimap() {
        getHolder().append(renderedMinimap);
        getMinimap().css("width", 200);

        var mainWidth = $(".main-view").first().width();
        $("#minimap-content").css("width", mainWidth);

        setScrollerListeners();

        triggerEvent("MinimapAttached", {});
    }

    function attachToolbarIcon() {
        $("#main-toolbar").find("#toolbar-go-live").after(renderedToolbarIcon);
        setToolbarIconListeners();
    }

    function enable() {
        var icon = getToolbarIcon();

        if (icon.hasClass("disabled")) {
            icon.removeClass("disabled");
            icon.addClass("enabled");
        }
    }

    function disable() {
        var icon = getToolbarIcon();

        if (icon.hasClass("enabled")) {
            icon.removeClass("enabled");
            icon.addClass("disabled");

            var minimap = getMinimap();

            if (minimap !== null) {
                if (minimap.is(":visible")) {
                    minimap.hide();
                }
            }
        }
    }

    function init() {
        renderedMinimap = renderMinimap();
        renderedToolbarIcon = renderToolbarIcon();

        attachToolbarIcon();
        attachMinimap();

    }

    exports.init = init;
    exports.enable = enable;
    exports.disable = disable;
    exports.getMinimap = getMinimap;
    exports.toggleMinimap = toggleMinimap;
    exports.resizeMinimap = resizeMinimap;
    exports.getSlider = getSlider;
    exports.getHolder = getHolder;
    exports.getMinimap = getMinimap;
    exports.getMinicode = getMinicode;
});
