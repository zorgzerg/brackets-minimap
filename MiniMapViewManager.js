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

        currentEditor = null,

        minicodeWidth = 0,
        minicodePaddingBottom = 0,

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

    function scrollUpdate() {
		var
            minicodeHeight = minicode.outerHeight() / 4,
            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),
            wrapperHeight = wrapper.height(),
            scrollbarHeight = Math.min(wrapperHeight, minicodeHeight),

            // Calculate slider height
            sliderHeight = Math.floor(editorHeight / 4);

        // Set slider height
        slider.css("height", sliderHeight + "px");

        // slider moving
        slider.css("top", Math.floor(currentEditor.getScrollPos().y * (scrollbarHeight - sliderHeight) / (codeHeight - editorHeight)));

        // Slide minicode block
        if (minicodeHeight > wrapperHeight) {
            var scrollPercent = (minicodeHeight - wrapperHeight) / (codeHeight - editorHeight);
            var scrollPos = -currentEditor.getScrollPos().y * scrollPercent;
            minicode.css("top", Math.floor(scrollPos) + "px");
        } else {
            minicode.css("top", "0px");
        }
	}

    function scrollTo(y) {
        var
            sliderHeight = slider.height(),
            minicodHeight = minicode.outerHeight() / 4,
            scrollbarHeight = Math.min(wrapper.height(), minicodHeight),

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
        currentEditor.setScrollPos(currentEditor.getScrollPos().x, currentEditor.getScrollPos().y - e.originalEvent.wheelDeltaY / 4);
    }

    function onSetAutohide() {
        minimap.toggleClass("minimap-nohide");

        Prefs.set("autohide", !minimap.hasClass("minimap-nohide"));
        Prefs.save();
    }

    function resizeMinimap(editor) {
        var
            trigger = false;

        if (editor) {
            var
                sizer = $(editor.getRootElement()).find(".CodeMirror-sizer"),
                codePaddingBottom = sizer.find(".CodeMirror-lines").css("padding-bottom"),

                width = sizer.children().eq(0).width(),
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

            if (codePaddingBottom !== minicodePaddingBottom) {
                minicodePaddingBottom = codePaddingBottom;
                console.info(minicodePaddingBottom);
                minicode.css("padding-bottom", parseInt(minicodePaddingBottom, 10) + 5 + "px");
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
	function runmode(sourcecode, modespec, n, prevcol) {
		var
            mode = CodeMirror.getMode(CodeMirror.defaults, modespec),
            html = '<div class="minimap-line">',
			tabSize = CodeMirror.defaults.tabSize,
            col = (prevcol !== undefined) ? prevcol - prevcol % tabSize : 0,

            callback = function (text, style) {
                var
                    content = '',
                    pos = 0;

                if (text === "\n") {
                    col = 0;
                    html += '&#8203;</div><div class="minimap-line">';
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
                            i = 0;

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
            i, e,
            cm = null;

        if (n !== undefined) {
            cm = currentEditor._codeMirror;
        }

		for (i = 0, e = lines.length; i < e; i += 1) {
			if (i) {
				callback("\n");
			}

			var
                stream = new CodeMirror.StringStream(lines[i]),
                tokens = null;

            if (cm) {
                tokens = cm.getLineTokens(n + i);
            }

			while (!stream.eol()) {
				var
                    style = mode.token(stream, state);

                if (cm) {
                    var
                        token = tokens.shift();

                    if (token) {
                        style = token.type;
                    } else {
                        style = null;
                    }
                }

                var asd = 0;

				callback(stream.current(), style);
				stream.start = stream.pos;
            }

		}

        html += "&#8203;</div>";
		return html;
	}

    function renderContent(doc, text, n, col) {
        var
            mode = doc.getLanguage().getMode(),
            html = runmode(text, mode, n, col),
            view = $(Mustache.render(html));

        return view;
    }

    function loadContent(doc) {
        var
            mode = doc.getLanguage().getMode(),
            text = doc.getText(),
            html = runmode(text, mode),
            view = $(Mustache.render(html));

        minicode.append(view);
    }

    function fold(range) {
        console.info();
    }

    function foldingLines(editor) {
        var
            lineFolds = editor._codeMirror._lineFolds,
            i = 0;
//            cm = minicode._codeMirror;

        console.info("all: ", lineFolds);

//        lineFolds.forEach(function (element, index) {
//            console.info(element, index);
//        });

//        $(lineFolds).each(function () {
//            console.info(i++, ": ", this);
//        });



//        if (!cm) {return; }
//        var
//            keys;
//
//        cm._lineFolds = lineFolds;
//
//        Object.keys(cm._lineFolds).forEach(function (line) {
//            cm.foldCode(+line);
//        });

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

            foldingLines(editor);
            scrollUpdate();
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

    function update(editor, callback) {
        currentEditor = editor;

        if (editor) {
            show(editor);
        } else {
            hide();
        }
    }

    function change(doc, changeList) {
        $(changeList).each(function () {
            var
                i = 0,
                text = "",
                line = function (n) {
                    return minicode.children().eq(n);
                };

            for (i = 0; i < this.text.length; i += 1) {
                if (i !== 0) {
                    text += "\n";
                }

                text += doc.getLine(i + this.from.line);
            }

            for (i = this.removed.length; i > 0; i -= 1) {
                line(this.from.line + i - 1).remove();
            }

            if (this.from.line > 0) {
                line(this.from.line - 1).after(renderContent(doc, text, this.from.line, this.from.ch - 1));
            } else {
                minicode.prepend(renderContent(doc, text));
            }
        });

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
    }

    exports.init = init;
    exports.scrollUpdate = scrollUpdate;
    exports.update = update;
    exports.change = change;
    exports.show = show;
    exports.hide = hide;
});
