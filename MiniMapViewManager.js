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

        tmplMinimap  = require("text!html/minimap.html"),

        minimap = null,
        minicode = null,
        slider = null,

        minicodeWidth = 0,

        draging = false,
        sliderOffset = 0,
        resizeMinimapInterval = null,
        topAdjust = 0,

        minimapWidth = 0,
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

    function getHolder() {
        return $("#editor-holder");
    }

    function getContainer() {
        return $("#minimap-container");
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

    function setAdjustTop(adjust) {
        topAdjust = adjust;
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

    function scrollTo(y) {
        var
            sliderHeight = getSlider().height(),
            minicode = getMinicode(),

            currentEditor = EditorManger.getCurrentFullEditor(),

            minicodHeight = minicode.height(),
            scrollbarHeight = Math.min(getMinimap().height(), minicodHeight / 4),

            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),
            editorHeight = $(currentEditor.getRootElement()).height(),

            adjustedY = y - sliderHeight / 2 - topAdjust;

        adjustedY *= (codeHeight - editorHeight)  / (scrollbarHeight - sliderHeight);
        currentEditor.setScrollPos(currentEditor.getScrollPos().x, Math.floor(adjustedY));
	}

    function onClickMinimap(e) {
        if (e.button === 0) {
            if (e.offsetY < 30) {

                if (topAdjust > 0) {
                    topAdjust = 0;
                } else {
                    topAdjust = 30;
                }
                getMinimap().css("top", topAdjust + "px");
                $(exports).triggerHandler("MinimapAdjustTop", topAdjust);
            } else {
                scrollTo(e.pageY);
                draging = true;
                getMinimap().addClass("minimap-ondrag");
            }
        }
    }

    function onClickSlider(e) {
        if (e.button === 0) {
            draging = true;
            sliderOffset = getSlider().height() / 2 - e.offsetY;
            getMinimap().addClass("minimap-ondrag");
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
        getMinimap().removeClass("minimap-ondrag");
    }

    function onClickTopAdjust() {
        console.info("click on top");
        return false;
    }

    function onWheel(e) {
        var
            currentEditor = getCurrentEditor();

        currentEditor.setScrollPos(currentEditor.getScrollPos().x, currentEditor.getScrollPos().y - e.originalEvent.wheelDeltaY / 4);
    }

    function setScrollerListeners() {
        getSlider().on("mousedown.minimap", onClickSlider);
        getMinimap().on("mousewheel.minimap", onWheel);
        getMinimap().on("mousedown.minimap", onClickMinimap);
        $(document).on("mousemove.minimap", onDrag);
        $(document).on("mouseup.minimap", onDrop);
    }

    function clearScrollerListeners() {
        getSlider().off("mousedown.minimap", onClickSlider);
        getMinimap().off("mousewheel.minimap", onWheel);
        getMinimap().off("mousedown.minimap", onClickMinimap);
        $(document).off("mousemove.minimap", onDrag);
        $(document).off("mouseup.minimap", onDrop);
    }



    function showMinimap(autohide) {
        getMinimap().show();


        $("#editor-holder .CodeMirror-vscrollbar").addClass("minimap-scrollbar-hide");

        clearScrollerListeners();
        setScrollerListeners();
    }

    function hideMinimap() {
        getMinimap().hide();
        clearInterval(resizeMinimapInterval);
        $("#editor-holder .CodeMirror-vscrollbar").removeClass("minimap-scrollbar-hide");
        clearScrollerListeners();
    }

    function resizeMinimap(editor) {
        var
            minimap = getMinimap(),
            minicode = getMinicode(),
            holder = getHolder(),
            currentEditor = getCurrentEditor(),
            trigger = false;

        if (editor) {
            var
                //$(editor.getRootElement()).find(".CodeMirror-sizer").children().get(0);
                width = $(editor.getRootElement()).find(".CodeMirror-sizer").children().width();

            if (minicodeWidth !== width) {
                minicode.css("width", width + "px");
                minicodeWidth = width;
                trigger = true; // ???
                console.info("code height = ", $(editor.getRootElement()).find(".CodeMirror-sizer").height(), " minicode height = ", minicode.height());
            }



//            var
//                height = $(currentEditor.getRootElement()).height();
//
//            if (editorHeight !== height) {
//                editorHeight = height;
//                trigger = true;
//            }
//
            if (trigger) {
                scrollUpdate();
            }
        }
    }



    function attachMinimap() {
        var
            view = $(Mustache.render(tmplMinimap));
        $("#editor-holder").append(view);
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
			//html = '<span class="line-number" value="1"></span>',
            html = '<div class="minimap-line">',
			//lineNumber = 1,
			tabSize = CodeMirror.defaults.tabSize,
			col,

            callback = function (text, style) {
                var
                    content = '',
                    pos = 0;

                if (text === "\n") {
                    //lineNumber += 1;
                    col = 0;
                    //html += '\n<span class="line-number" value="' + lineNumber + '"></span>';
                    html += '</div><div>';
                    return;
                }

                // replace tabs
                //for (pos = 0;;) {


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
//                console.info(stream.current());
//                console.info(style);

				callback(stream.current(), style);
				stream.start = stream.pos;
			}

            //callback("\n");
		}
		return html;
	}

    function loadContent(doc) {
        var
            mode = doc.getLanguage().getMode(),
            text = doc.getText(),
            html = runmode(text, mode),
            view = $(Mustache.render(html));

        getMinicode().append(view);
    }

    function show(editor) {
        if (editor) {
            loadContent(editor.document);
            minimap.show();

            resizeMinimapInterval = setInterval(function () {
                resizeMinimap(editor);
            }, 100);
        }
    }

    function hide() {
        minicode.empty();
        minimap.hide();

        if (resizeMinimapInterval !== null) {
            clearInterval(resizeMinimapInterval);
        }
    }

    function update(editor) {
        if (editor) {
            show(editor);

            console.info(editor.getRootElement());
        } else {
            hide();
        }
    }

    function init() {
        attachMinimap();

        // Init DOM-handlers
        minimap = $("#minimap-container");
        minicode = minimap.find("#minimap-content");
        slider = minimap.find("#minimap-slider");



//        getSlider().dblclick(function () {
//            var
//                minimap = getMinimap();
//
//            minimap.toggleClass("minimap-nohide");
//            $(exports).triggerHandler("MinimapAutohide", !minimap.hasClass("minimap-nohide"));
//        });

        //getMinimap().css("top", topAdjust);
    }

    exports.init = init;
    exports.getMinimap = getMinimap;
    exports.resizeMinimap = resizeMinimap;
    exports.getSlider = getSlider;
    exports.getHolder = getHolder;
    exports.getMinimap = getMinimap;
    exports.getMinicode = getMinicode;
    exports.getCurrentEditor = getCurrentEditor;
    exports.setAdjustTop = setAdjustTop;

    exports.showMinimap = showMinimap;
    exports.hideMinimap = hideMinimap;
    exports.scrollUpdate = scrollUpdate;
    exports.update = update;
});
