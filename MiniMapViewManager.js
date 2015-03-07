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

/*global console, define, brackets, Mustache, $, parseInt, setInterval, clearInterval, String */
/*jslint nomen: true, vars: true */
define(function (require, exports, module) {
    'use strict';

    var
        EditorManger  = brackets.getModule("editor/EditorManager"),
        CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        PreferencesManager = brackets.getModule('preferences/PreferencesManager'),

        Config = require('Config'),
        Prefs = PreferencesManager.getExtensionPrefs(Config.NAME),

        tmplMinimap  = require("text!html/minimap.html"),

        holder = null,
        minimap = null,
        wrapper = null,
        minicode = null,
        slider = null,

        minicodeWidth = 0,

        draging = false,
        sliderOffset = 0,
        resizeMinimapInterval = null,
        topAdjust = 0,

        minimapHeight = 0,
        editorHeight = 0,

        entityMap = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': '&quot;',
            "'": '&#39;',
            "/": '&#x2F;'
        };

    function getCurrentEditor() {
        return EditorManger.getCurrentFullEditor();
    }

    function scrollUpdate() {
		var
            currentEditor = getCurrentEditor(),
            minicodeHeight = (minicode.height() + parseInt(minicode.css("padding-top"), 10) + parseInt(minicode.css("padding-bottom"), 10))  / 4,
            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),
            minimapHeight = wrapper.height(),
            scrollbarHeight = Math.min(minimapHeight, minicodeHeight),

            // Calculate slider height
            sliderHeight = Math.floor(editorHeight / 4);

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

    function scrollTo(y) {
        var
            sliderHeight = slider.height(),
            currentEditor = getCurrentEditor(),
            minicodHeight = minicode.height() + parseInt(minicode.css("padding-top"), 10) + parseInt(minicode.css("padding-bottom"), 10),
            scrollbarHeight = Math.min(wrapper.height(), minicodHeight / 4),

            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),

            adjustedY = y - sliderHeight / 2 - topAdjust;

        adjustedY *= (codeHeight - editorHeight)  / (scrollbarHeight - sliderHeight);
        currentEditor.setScrollPos(currentEditor.getScrollPos().x, Math.floor(adjustedY));
	}

    function onClickMinimap(e) {
        if (e.button === 0) {
            scrollTo(e.pageY);
            draging = true;
            minimap.addClass("minimap-ondrag");
        }
    }

    function onClickSlider(e) {
        if (e.button === 0) {
            draging = true;
            sliderOffset = slider.height() / 2 - e.offsetY;
            minimap.addClass("minimap-ondrag");
        }
        e.stopPropagation();
    }

    function onDrag(e) {
        if (draging) {
            scrollTo(e.pageY + sliderOffset);
            e.stopPropagation();
        }
    }

    function onDrop(e) {
        draging = false;
        sliderOffset = 0;
        minimap.removeClass("minimap-ondrag");
    }

    function onClickMinimapTop(e) {
        if (topAdjust > 0) {
            topAdjust = 0;
        } else {
            topAdjust = 30;
        }
        minimap.css("padding-top", topAdjust + "px");

        e.stopPropagation();

        setTimeout(function () {
            scrollUpdate();
        }, 400);

        Prefs.set("adjusttop", topAdjust);
        Prefs.save();
    }

    function onWheel(e) {
        var
            currentEditor = getCurrentEditor();

        currentEditor.setScrollPos(currentEditor.getScrollPos().x, currentEditor.getScrollPos().y - e.originalEvent.wheelDeltaY / 4);
    }

    function onSetAutohide() {
        minimap.toggleClass("minimap-nohide");

        Prefs.set("autohide", !minimap.hasClass("minimap-nohide"));
        Prefs.save();
    }

    function resizeMinimap(editor) {
        var
            currentEditor = getCurrentEditor(),
            trigger = false;

        if (editor) {
            var
                width = $(editor.getRootElement()).find(".CodeMirror-sizer").children().width(),
                height = $(editor.getRootElement()).height();

            if (minicodeWidth !== width) {
                minicode.css("width", width + "px");
                minicodeWidth = width;
                trigger = true;
            }

            if (editorHeight !== height) {
                editorHeight = height;
                trigger = true;
            }

            if (trigger) {
                scrollUpdate();
            }
        }
    }

    function attachMinimap() {
        var
            view = $(Mustache.render(tmplMinimap));

        holder = $("#editor-holder");
        holder.append(view);

        // Init DOM-handlers
        minimap = holder.find("#minimap-container");
        wrapper = minimap.find("#minimap-wrapper");
        minicode = minimap.find("#minimap-content");
        slider = minimap.find("#minimap-slider");

        slider.on("mousedown.minimap", onClickSlider);
        slider.dblclick(onSetAutohide);

        minimap.find("#minimap-top").on("mousedown.minimap", onClickMinimapTop);
        minimap.on("mousewheel.minimap", onWheel);
        minimap.on("mousedown.minimap", onClickMinimap);
        $(document).on("mousemove.minimap", onDrag);
        $(document).on("mouseup.minimap", onDrop);
    }

    function escapeHtml(string) {
		return String(string).replace(/[&<>"'\/]/g, function (s) {
			return entityMap[s];
		});
	}

    // CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: http://codemirror.net/LICENSE
	function runmode(sourcecode, modespec) {
		var
            mode = CodeMirror.getMode(CodeMirror.defaults, modespec),
            html = '<div class="minimap-line">',
			tabSize = CodeMirror.defaults.tabSize,
			col,

            callback = function (text, style) {
                var
                    content = '',
                    pos = 0;

                if (text === "\n") {
                    col = 0;
                    html += '</div>\n<div class="minimap-line">';
                    return;
                }

                while (true) {
                    var
                        idx = text.indexOf("\t", pos);

                    if (idx === -1) {
                        content += text.slice(pos);
                        col += text.length - pos;
                        break;

                    } else {
                        col += idx - pos;
                        content += text.slice(pos, idx);

                        var
                            size = tabSize - col % tabSize,
                            i;
                        col += size;

                        for (i = 0; i < size; i += 1) {
                            content += " ";
                        }
                        pos = idx + 1;
                    }
                }

                if (style) {
                    if (style === 'string' || style === 'comment') {
                        content = escapeHtml(content);
                    }
                    var
                        className = "cm-" + style.replace(/ +/g, " cm-");

                    html += '<span class="' + className + '">' + content + '</span>';
                } else {
                    html += content;
                }
            };

		var
            lines = CodeMirror.splitLines(sourcecode),
			state = CodeMirror.startState(mode),
            i, e;

		for (i = 0, e = lines.length; i < e; i += 1) {
			if (i) {
				callback("\n");
			}

			var
                stream = new CodeMirror.StringStream(lines[i]);

			while (!stream.eol()) {
				var
                    style = mode.token(stream, state);

				callback(stream.current(), style);
				stream.start = stream.pos;
			}

		}
		return html;
	}

    function loadContent(doc) {
        var
            mode = doc.getLanguage().getMode(),
            text = doc.getText(),
            html = runmode(text, mode),
            view = $(Mustache.render(html));

        minicode.append(view);
    }

    function show(editor) {
        if (editor) {
            minicode.empty();

            loadContent(editor.document);
            minimap.show();

            if (resizeMinimapInterval !== null) {
                clearInterval(resizeMinimapInterval);
            }

            resizeMinimapInterval = setInterval(function () {
                resizeMinimap(editor);
            }, 100);
        }

        holder.find(".CodeMirror-vscrollbar").addClass("minimap-scrollbar-hide");
    }

    function hide() {
        minicode.empty();
        minimap.hide();

        if (resizeMinimapInterval !== null) {
            clearInterval(resizeMinimapInterval);
        }

        holder.find(".CodeMirror-vscrollbar").removeClass("minimap-scrollbar-hide");
    }

    function update(editor) {
        if (editor) {
            show(editor);
        } else {
            hide();
        }
    }

    function init() {
        Prefs.definePreference("autohide", "boolean", false);
        Prefs.definePreference("adjusttop", "integer", 0);

        attachMinimap();

        topAdjust = Prefs.get("adjusttop");
        minimap.css("padding-top", topAdjust + "px");


        if (!Prefs.get("autohide")) {
            minimap.addClass("minimap-nohide");
        }




        //getMinimap().css("top", topAdjust);
    }

    exports.init = init;
    exports.resizeMinimap = resizeMinimap;
    exports.getCurrentEditor = getCurrentEditor;
    exports.scrollUpdate = scrollUpdate;
    exports.update = update;
    exports.show = show;
    exports.hide = hide;
});
