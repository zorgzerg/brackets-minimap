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

/*global define, brackets, $, console*/
/*jslint nomen: true, vars: true */
define(function (require, exports, module) {
    'use strict';

    var
        Config = require('Config'),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        PreferencesManager = brackets.getModule('preferences/PreferencesManager'),

        modulePath = ExtensionUtils.getModulePath(module),
        Prefs = PreferencesManager.getExtensionPrefs(Config.NAME),
        moduleVersion = null;

    function getTooltip() {
        return $("#minimap-tooltip");
    }

    function parseChangelog(callback) {
        var
            FileUtils = brackets.getModule("file/FileUtils"),
            FileSystem = brackets.getModule("filesystem/FileSystem"),
            version = null;

        FileUtils.readAsText(FileSystem.getFileForPath(modulePath + "CHANGELOG.md")).done(function (content) {
            var
                lines = content.replace(/^[\n\r]+|[\n\r]+$/g, '').split(/[\n\r]+/),
                title = $(".minimap-tooltip>h4"),
                list = $(".minimap-tooltip>ul"),
                filled = false;

            $(lines).each(function () {
                var
                    line = this.split(" ");

                if (line[0] === "##") {
                    if (title.text() === "") {
                        if (line[1] === moduleVersion) {
                            title.text("New in Minimap v" + line[1]);
                            filled = true;
                        }
                    } else {
                        return false;
                    }
                }

                if (title.text() !== "" && line[0] === "*") {
                    line.splice(0, 1);
                    $("<li>" + line.join(" ") + "</li>").appendTo(list);
                }
            });


            if (filled) {
                callback();
            }
        });
    }

    function hide() {
        getTooltip().removeClass("minimap-tooltip-showed");
        $("#minimap-container").removeClass("minimap-ondrag");
        Prefs.set("whatsnew", moduleVersion);
    }

    function show() {
        $.get(modulePath + 'package.json', function (data) {
            moduleVersion = JSON.parse(data).version;

            if (Prefs.get("whatsnew") !== moduleVersion) {
                $("a").on("click", hide);

                parseChangelog(function () {
                    getTooltip().addClass("minimap-tooltip-showed");
                    $("#minimap-container").addClass("minimap-ondrag");
                });
            }
        });
    }

    exports.show = show;
});
