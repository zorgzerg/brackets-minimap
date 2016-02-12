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
/*jslint plusplus: true */

define(function (require, exports, module) {
    'use strict';

    var
        EditorManger  = brackets.getModule("editor/EditorManager"),
        CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        PreferencesManager = brackets.getModule('preferences/PreferencesManager'),

        Config = require('Config'),
        Prefs = PreferencesManager.getExtensionPrefs(Config.NAME),

        tmplMinimap  = require("text!html/minimap.html"),

        styles = null,

        holder = null,
        minimap = null,
        wrapper = null,
        minicode = null,
        slider = null,
        toolbarBtn = null,
        sliderIndicator = null,

        currentEditor = null,

        draging = false,
        resizing = false,
        sliderOffset = 0,
        scrollBack = null,
        onScrolling = false,

        resizeMinimapInterval = null,
        topAdjust = 0,

        minicodeWidth = 0,
        minicodePaddingBottom = 0,
        editorHeight = 0,
        maxWidth = 0,

        zoomRatio = 0,
        minimapOpacity = 0.5,

        entityMap = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': '&quot;',
            "'": '&#39;',
            "/": '&#x2F;',
            "{": '&#123;',
            "}": '&#125;'
        };

    function scrollUpdate() {
		var
            minicodeHeight = minicode.outerHeight() / zoomRatio,
            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),
            wrapperHeight = wrapper.height(),
            scrollbarHeight = Math.min(wrapperHeight, minicodeHeight),

            // Calculate slider height
            sliderHeight = Math.floor(editorHeight / zoomRatio);

        // Set slider height
        slider.css("height", sliderHeight + "px");

        // slider moving
        slider.css("top", Math.floor(currentEditor.getScrollPos().y * (scrollbarHeight - sliderHeight) / (codeHeight - editorHeight)));

        // Slide minicode block
        if (minicodeHeight > wrapperHeight) {
            var scrollPercent = (minicodeHeight - wrapperHeight) / (codeHeight - editorHeight);
            var scrollPos = -currentEditor.getScrollPos().y * scrollPercent;
            minicode.css("top", scrollPos + "px");
        } else {
            minicode.css("top", "0px");
        }
	}

    function smoothScroll(to, scrollType) {
        var
            from = currentEditor.getScrollPos().y,
            x = currentEditor.getScrollPos().x,
            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),
            wrapperHeight = wrapper.height(),

            speedScrolling = codeHeight / 700,
            duration = Math.abs(to - from) / speedScrolling + 300,

            start = new Date().getTime(),

            quadratic = function (progress) {
                return 1 - (progress - 1) * (progress - 1);
            },

            linear = function (progress) {
                return progress;
            },
            animate;

        onScrolling = false;
        animate = setInterval(function () {
            if (!onScrolling) {
                clearInterval(animate);

                if (scrollType !== "linear" && scrollType !== "quadratic") {
                    currentEditor.setScrollPos(x, to);
                    return;
                }

                onScrolling = true;
                setTimeout(function callback() {
                    var
                        now = (new Date().getTime()) - start,
                        progress = now / duration,
                        result;

                    if (onScrolling) {
                        if (progress >= 1) {
                            result = to;
                            onScrolling = false;
                        } else {
                            switch (scrollType) {
                            case "linear":
                                result = Math.floor((to - from) * linear(progress) + from);
                                break;
                            case "quadratic":
                                result = Math.floor((to - from) * quadratic(progress) + from);
                                break;
                            }
                        }

                        currentEditor.setScrollPos(x, result);

                        if (progress < 1) {
                            setTimeout(callback, 10);
                        }
                    }
                }, 0);
            }
        }, 10);

    }

    function scrollTo(y, scrollType) {
        var
            sliderHeight = slider.height(),
            minicodHeight = minicode.outerHeight() / zoomRatio,
            scrollbarHeight = Math.min(wrapper.height(), minicodHeight),
            searchBar = $(".content>.modal-bar"),
            
            codeHeight = $(currentEditor.getRootElement()).find(".CodeMirror-sizer").height(),
            barHeight = searchBar.length === 1 ? searchBar.outerHeight() : 0,

            adjustedY = y - sliderHeight / 2 - topAdjust - barHeight;

        adjustedY *= (codeHeight - editorHeight)  / (scrollbarHeight - sliderHeight);

        smoothScroll(Math.floor(adjustedY), scrollType);
	}

    function scrollToLine(y, scrollType) {
        var
            sliderHeight = slider.height(),
            minicodeTop = parseInt(minicode.css("top"), 10),
            adjustedY = (y - sliderHeight / 2 - topAdjust - minicodeTop) * zoomRatio;

        smoothScroll(Math.floor(adjustedY), scrollType);
    }

    function updateStyles(maxWidth) {
        var
            html =  ".minimap-ondrag, #minimap-container:hover {max-width: " + maxWidth + "px !important; }" +
            ".minimap-nohide {max-width: " + maxWidth + "px !important;}";
        styles.html(html);
    }

    function onClickMinimap(e) {
        if (e.button === 0) {
            if ((e.ctrlKey || e.metaKey) && scrollBack === null) {
                scrollBack = currentEditor.getScrollPos().y;
            }

            if (e.shiftKey) {
                scrollToLine(e.pageY, "quadratic");
            } else {
                scrollTo(e.pageY, "quadratic");
            }


            draging = true;
            minimap.addClass("minimap-ondrag");

            e.stopPropagation();
        }
    }

    function onClickSlider(e) {
        if (e.button === 0 && scrollBack === null) {
            if (e.ctrlKey || e.metaKey) {
                scrollBack = currentEditor.getScrollPos().y;
            }

            sliderOffset = slider.height() / 2 - e.offsetY;
            onScrolling = false;

            draging = true;
            minimap.addClass("minimap-ondrag");
        }

        // On/off minimap fading
        if (e.button === 1) {
            var
                fading = Prefs.get("fading");
            minimap.toggleClass("minimap-no-fading", fading);
            Prefs.set("fading", !fading);
            Prefs.save();
        }

        e.stopPropagation();
    }

    function onGripClick(e) {
        if (e.button === 0) {
            resizing = e.pageX;
            minimap.addClass("minimap-ondrag minimap-onresize");

            maxWidth = Math.min(parseInt(minimap.css("max-width"), 10), parseInt(minimap.css("width"), 10));
        }

        e.stopPropagation();
    }

    function onDrag(e) {
        if (draging) {
            if ((e.ctrlKey || e.metaKey) && scrollBack === null) {
                scrollBack = currentEditor.getScrollPos().y;
            }

            if (!onScrolling) {
                scrollTo(e.pageY + sliderOffset);
            }

            e.stopPropagation();
        }

        if (resizing) {
            var
                delta = resizing - e.pageX;

            maxWidth += delta;

            updateStyles(Math.max(Math.min(holder.width() / zoomRatio, maxWidth), 30));

            resizing = e.pageX;
        }
    }

    function onDrop(e) {
        if (scrollBack !== null) {
            onScrolling = false;
            smoothScroll(scrollBack, "quadratic");
            scrollBack = null;
        }

        draging = false;
        sliderOffset = 0;
        minimap.removeClass("minimap-ondrag minimap-onresize");

        if (resizing !== false) {
            resizing = false;
            maxWidth = parseInt(minimap.css("max-width"), 10);
            Prefs.set("width", maxWidth);
            Prefs.save();
        }
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
            direction = e.originalEvent.wheelDeltaY / Math.abs(e.originalEvent.wheelDeltaY) || e.originalEvent.wheelDeltaX / Math.abs(e.originalEvent.wheelDeltaX),
            indicator = null;

        if (e.ctrlKey || e.metaKey) {
            if (!isNaN(direction)) {
                // Zoom-out minicode in range: [1/2, 1/10]
                zoomRatio = Math.min(Math.max(zoomRatio - direction / 2, 2), 10);

                sliderIndicator.stop(true, true);
                sliderIndicator.show();
                sliderIndicator.html("x 1/" + zoomRatio);
                sliderIndicator.delay(600).fadeOut(800);

                Prefs.set("zoomratio", zoomRatio);
                Prefs.save();

                minicode.css("-webkit-transform", "scale(" + 1 / zoomRatio + ")");
                scrollUpdate();
            }
        } else if (e.shiftKey) {
            if (!isNaN(direction)) {
                // Transparent minimap in range: [20%, 100%]
                minimap.css("transition", "max-width 0.2s ease-out 0.1s, padding-top 0.3s linear 0s, opacity 0s ease-out 0s");
                minimap.removeClass("minimap-no-fading");
                minimap.removeClass("minimap-no-wheeling");

                var
                    opacity = minimap.css("opacity");

                opacity = Math.round(opacity * 100) / 100;

                minimapOpacity = Math.min(Math.max(opacity + direction * 0.05, 0.2), 1).toFixed(2);
                minimap.css("opacity", minimapOpacity);

                sliderIndicator.stop(true, false);
                sliderIndicator.css("opacity", 1);
                sliderIndicator.show();
                sliderIndicator.html("Transparent: " + Math.round(100 - minimapOpacity * 100) + "%");

                sliderIndicator.delay(800).fadeOut(700, function () {
                    minimap.css("transition", "max-width 0.2s ease-out 0.1s, padding-top 0.3s linear 0s, opacity 0.3s ease-out 0.2s");
                    minimap.toggleClass("minimap-no-fading", !Prefs.get("fading"));
                    minimap.addClass("minimap-no-wheeling");
                });

                Prefs.set("transparent", Math.round(100 - minimapOpacity * 100));
                Prefs.save();
            }
        } else {
            currentEditor.setScrollPos(currentEditor.getScrollPos().x, currentEditor.getScrollPos().y - e.originalEvent.wheelDeltaY / 6);
        }
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

        styles = $('<style id="minimap-styles" />').appendTo("body");

        holder = $("#editor-holder");
        holder.append(view);

        //TODO: Add the on/off button to right tollbar

//        toolbarBtn = $('<a id="minimap-toolbar-btn" title="Minimap disabled" href="#"></a>');
//        $("#main-toolbar .buttons").append(toolbarBtn);

        // Init DOM-handlers
        minimap = holder.find("#minimap-container");
        wrapper = minimap.find("#minimap-wrapper");
        minicode = minimap.find("#minimap-content");
        slider = minimap.find("#minimap-slider");
        sliderIndicator = slider.find("#minimap-sliderindicator");

        var
            grip = minimap.find("#minimap-grip");

        grip.on("mousedown.minimap", onGripClick);

        slider.on("mousedown.minimap", onClickSlider);
        slider.dblclick(onSetAutohide);

        wrapper.find("#minimap-top").on("mousedown.minimap", onClickMinimapTop);
        wrapper.on("mousewheel.minimap", onWheel);
        wrapper.on("mousedown.minimap", onClickMinimap);
        $(document).on("mousemove.minimap", onDrag);
        $(document).on("mouseup.minimap", onDrop);
    }

    function escapeHtml(string) {
		return String(string).replace(/[&<>"'\/\{\}]/g, function (s) {
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
                    html += escapeHtml(content);
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

    function fold(cm, from, to) {
        var
            i;
        for (i = from.line; i < to.line; i++) {
            minicode.children().eq(i + 1).wrap("<div class='minimap-folded'></div>");
        }

        minicode.children().eq(from.line).addClass("minimap-folded-highlight");
    }

    function unfold(cm, from, to) {
        var
            i;
        for (i = from.line; i < to.line; i++) {
            minicode.children().eq(i + 1).children().eq(0).unwrap();
        }

        minicode.children().eq(from.line).removeClass("minimap-folded-highlight");
    }

    function foldAll(editor) {
        var
            n = null,
            cm = editor._codeMirror,
            lineFolds = cm._lineFolds;

        for (n in lineFolds) {
            if (lineFolds.hasOwnProperty(n)) {
                fold(cm, lineFolds[n].from, lineFolds[n].to);
            }
        }
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

            foldAll(editor);
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
        if (currentEditor !== editor) {
            if (currentEditor) {
                currentEditor._codeMirror.off("fold", fold);
                currentEditor._codeMirror.off("unfold", unfold);
            }

            if (editor) {
                editor._codeMirror.on("fold", fold);
                editor._codeMirror.on("unfold", unfold);
            }
        }

        currentEditor = editor;

        if (currentEditor) {
            show(currentEditor);
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
                },

                depthFold = function (n) {
                    var
                        depth = 0,
                        l = minicode.children().eq(n);

                    while (l !== null && l !== undefined && l.hasClass("minimap-folded")) {
                        depth++;
                        l = l.children().eq(0);
                    }

                    return depth;
                },

                wrapFold = function (lvl, html) {
                    var
                        wrap = "",
                        root = $("<div/>").append(html),
                        i = 0;

                    for (i = 0; i < lvl; i++) {
                        root.children().eq(0).wrap("<div class='minimap-folded'></div>");
                    }

                    return root.children();
                },

                foldLvl = depthFold(this.from.line);

            for (i = 0; i < this.text.length; i++) {
                if (i !== 0) {
                    text += "\n";
                }

                text += doc.getLine(i + this.from.line);
            }

            for (i = this.removed.length; i > 0; i--) {
                line(this.from.line + i - 1).remove();
            }

            var
                html = wrapFold(foldLvl, renderContent(doc, text, this.from.line, this.from.ch - 1));

            if (this.from.line > 0) {
                line(this.from.line - 1).after(html);
            } else {
                // for 0 - line
                minicode.prepend(html);
            }
        });

    }

    function init() {
        Prefs.definePreference("autohide", "boolean", false);
        Prefs.definePreference("adjusttop", "integer", 0);
        Prefs.definePreference("width", "integer", 200);
        Prefs.definePreference("zoomratio", "integer", 4);
        Prefs.definePreference("fading", "boolean", true);
        Prefs.definePreference("transparent", "integer", 60);

        attachMinimap();
        maxWidth = Prefs.get("width");

        minimap.css("opacity", (100 - Prefs.get("transparent")) / 100);

        updateStyles(maxWidth);

        topAdjust = Prefs.get("adjusttop");
        minimap.css("padding-top", topAdjust + "px");

        zoomRatio = Prefs.get("zoomratio");
        minicode.css("-webkit-transform", "scale(" + 1 / zoomRatio + ")");

        minimap.toggleClass("minimap-no-fading", !Prefs.get("fading"));

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
