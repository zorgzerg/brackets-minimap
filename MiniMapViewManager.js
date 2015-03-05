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

        renderedMinimap = null,

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
            currentEditor = getCurrentEditor(),
            trigger = false;

        if (currentEditor) {
            var width = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").width();
            if (minimapWidth !== width) {
                minimapWidth = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").width();
                minicode.css("width", minimapWidth);
                minimap.css("width", minimapWidth / 4);
                trigger = true;
            }

            var height = holder.height() - topAdjust;
//            if (minimapHeight !== height) {
//                minimapHeight = height;
//                minimap.css("height", minimapHeight + "px");
//                trigger = true;
//            }

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

        if (resizeMinimapInterval !== null) {
            clearInterval(resizeMinimapInterval);
        }

        resizeMinimapInterval = setInterval(function () {
            resizeMinimap();
		}, 50);

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

    function attachMinimap() {
        getHolder().append(renderedMinimap);

        getSlider().dblclick(function () {
            var
                minimap = getMinimap();

            minimap.toggleClass("minimap-nohide");
            $(exports).triggerHandler("MinimapAutohide", !minimap.hasClass("minimap-nohide"));
        });

    }

    function escapeHtml(string) {
		return String(string).replace(/[&<>"'\/]/g, function (s) {
			return entityMap[s];
		});
	}

    // CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: http://codemirror.net/LICENSE
	function runmode(string, modespec) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, modespec),
			options,
			html = '<span class="line-number" value="1"></span>',
			lineNumber = 1,
			tabSize = (options && options.tabSize) || CodeMirror.defaults.tabSize,
			col = 0;


		var callback = function (text, style) {
			if (text === "\n") {
				lineNumber = lineNumber + 1;
				col = 0;
				html += '\n<span class="line-number" value="' + lineNumber + '"></span>';
				return;
			}
			var content = '';
			// replace tabs
            var
                pos = 0;

			for (pos = 0;;) {
				var
                    idx = text.indexOf("\t", pos);

				if (idx === -1) {
					content += text.slice(pos);
					col += text.length - pos;
					break;
				} else {
					col += idx - pos;
					content += text.slice(pos, idx);

					var size = tabSize - col % tabSize;
					col += size;
					for (var i = 0; i < size; ++i) {
						content += " ";
					}
					pos = idx + 1;
				}
			}

			if (style) {
				if (style === 'string' || style === 'comment') {
					content = escapeHtml(content);
				}
				var className = "cm-" + style.replace(/ +/g, " cm-");
				html += '<span class="' + className + '">' + content + '</span>';
			} else {
				html += content;
			}
		};

		var lines = CodeMirror.splitLines(string),
			state = CodeMirror.startState(mode);

		for (var i = 0, e = lines.length; i < e; ++i) {
			if (i) {
				callback("\n");
			}
			var stream = new CodeMirror.StringStream(lines[i]);
			while (!stream.eol()) {
				var style = mode.token(stream, state);
				callback(stream.current(), style);
				stream.start = stream.pos;
			}
		}
		return html;
	};

    function update(editor) {
        console.info(editor);
    }

    function init() {
        renderedMinimap = renderMinimap();
        attachMinimap();
        getMinimap().css("top", topAdjust);
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
