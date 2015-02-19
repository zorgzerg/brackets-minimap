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

/*global define, brackets, Mustache, $ */
/*jslint nomen: true, vars: true */
define(function (require, exports, module) {
    'use strict';

    var
        tmplMinimap  = require("text!html/minimap.html"),
        tmplToolbarIcon  = require("text!html/toolbar.html"),

        masterLineHeight        = null,
        masterFontSize          = null,

        renderedMinimap       = null,
        renderedToolbarIcon    = null;

    function triggerEvent(event, data) {
        $(exports).triggerHandler(event, data);
    }

    function getMinimap() {
        return $("#minimap-wrapper");
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

    function setToolbarIconListeners() {
        $("#code-overview-icon").click(function () {

            var
                minimap = getMinimap(),
                icon = getToolbarIcon();

            if (minimap !== null) {
                if (minimap.is(":visible")) {
                    minimap.hide();
                    triggerEvent("MinimapHidden", {});
                } else if (icon.hasClass("enabled")) {
                    minimap.show();
                    triggerEvent("MinimapVisible", {});
                }
            }
        });
    }

    function attachMinimap() {
        $("#editor-holder").append(renderedMinimap);
        getMinimap().css("width", 200);

        var mainWidth = $(".main-view").first().width();
        $("#minimap-content").css("width", mainWidth);

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
});
