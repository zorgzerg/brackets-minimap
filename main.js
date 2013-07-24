/*
 * Copyright (c) 2013 Website Duck LLC
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
 
/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
	"use strict";

	var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
	var DocumentManager = brackets.getModule("document/DocumentManager");
	var EditorManager = brackets.getModule("editor/EditorManager");
	
	var currentEditor;
	var dragging = false;
	
	ExtensionUtils.loadStyleSheet(module, 'main.css');
	$('.main-view').append('<div id="wdMinimap"><div class="visible-box"></div><pre></pre></div>');
		
	function _documentSwitch() {
		if (currentEditor) {
			$(currentEditor.document).off('.wdMinimap');
		}
		
		currentEditor = EditorManager.getCurrentFullEditor();
		
		$('#wdMinimap pre').css('top', 0);
		_documentEdit();
		
		$(currentEditor.document).on('change.wdMinimap', _documentEdit);
		$(currentEditor).on('scroll.wdMinimap', _editorScroll);
		
	}
		
	function _documentEdit() {
		$('#wdMinimap pre').text(currentEditor.document.getText());
		_editorScroll();
	}
	
	function _editorScroll() {
		//currentEditor.getFirstVisibleLine() does not work
		//console.log(Math.floor(((currentEditor.getLastVisibleLine() - currentEditor.getFirstVisibleLine())/currentEditor.lineCount())*100));
		
		var scroller = $('#editor-holder .CodeMirror:visible .CodeMirror-scroll');
		var pre = $('#wdMinimap pre');
		var visBox = $('#wdMinimap .visible-box');
		
		var heightPercent = Math.max( scroller.height() / pre.height(), 0 );
				
		visBox.css('height', Math.floor(heightPercent * pre.height() / 4) + 'px');
		
		if ((pre.height()/4) > $(window).height()) {
			var overage = (pre.height()/4) - $(window).height();
			var scrollPercent = currentEditor.getScrollPos().y / (pre.height() - scroller.height());
			pre.css('top', 0 - Math.floor( scrollPercent * overage ) + 'px');
		}
		visBox.css('top', parseInt(pre.css('top')) + Math.floor(currentEditor.getScrollPos().y/4) + 'px');
	}
	
	function _scrollTo(y) {
		var adjustedY = y - parseInt($('#wdMinimap pre').css('top')); //Add the negative pixels of the top of pre
		adjustedY = adjustedY - $('#wdMinimap .visible-box').height()/2; //Subtract half of the visible box to center the cursor vertically on it
		adjustedY = adjustedY * 4; //Scale up to regular size
		currentEditor.setScrollPos( currentEditor.getScrollPos.x, Math.max(adjustedY, 0) );
	}
	
	$('#wdMinimap pre, #wdMinimap .visible-box').mousedown(function(e) { dragging = true; _scrollTo(e.pageY); });
	
	$(document).mouseup(function() { dragging = false; });
	
	$('#wdMinimap pre, #wdMinimap .visible-box').mousemove(function(e) {
		if (dragging) {
			_scrollTo(e.pageY);
			e.stopPropagation();
		}
	});
	
	$(DocumentManager).on('currentDocumentChange', _documentSwitch);
	$(window).resize(_editorScroll);
	$('.main-view .content').css('right', 120 + $('#main-toolbar').width() + 'px');
	
	
});