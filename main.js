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
	
	var NAME = 'websiteduck.wdminimap';
	var MINIMAP_WIDTH = 120;

	var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
	var DocumentManager = brackets.getModule('document/DocumentManager');
	var EditorManager = brackets.getModule('editor/EditorManager');
	var CommandManager = brackets.getModule('command/CommandManager');
	var Menus = brackets.getModule('command/Menus');
	var PreferencesManager = brackets.getModule('preferences/PreferencesManager');
	
	ExtensionUtils.loadStyleSheet(module, 'main.css');
	
	var preferences = PreferencesManager.getPreferenceStorage(module, { enabled: false });
	var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
	
	var currentEditor;
	var enabled = preferences.getValue('enabled');
	var hidden = false;
	var dragging = false;
	var contentCssRight = 0;
	var resizeInterval;
	var editorHeight = 0;
	
	enabled = (enabled !== undefined ? enabled : true);
	
	function hide()
	{
		if (enabled) {
			$('#wdMinimap').hide();
			$('.main-view .content').css('right', contentCssRight + 'px');
			hidden = true;
		}
	}
	
	function show()
	{
		$('#wdMinimap').show();
		$('.main-view .content').css('right', MINIMAP_WIDTH + contentCssRight + 'px');		
		hidden = false;
	}
	
	function enable() 
	{
		enabled = true;
		
		contentCssRight = parseInt($('.main-view .content').css('right'));
		$('.main-view').append('<div id="wdMinimap"><div class="visible-box"></div><pre></pre></div>');
		$('.main-view .content').css('right', MINIMAP_WIDTH + contentCssRight + 'px');		
		updateListeners();
		documentSwitch();
		
		resizeInterval = setInterval(function() {
			if (currentEditor) {
				if (editorHeight != $('#editor-holder').height()) {
					editorResize();
					editorHeight = $('#editor-holder').height();
				}
			}
			if ($('#wdMinimap').css('background-color') != $('.CodeMirror').css('background-color')) setThemeColors();
		}, 500);
		
		preferences.setValue('enabled', true);	
		CommandManager.get(NAME + 'showMinimap').setChecked(true);		
	}
	
	function disable()
	{
		enabled = false;
		
		$('#wdMinimap').remove();
		$('.main-view .content').css('right', contentCssRight + 'px');
		updateListeners();
		
		clearInterval(resizeInterval);
		
		preferences.setValue('enabled', false);	
		CommandManager.get(NAME + 'showMinimap').setChecked(false);
	}
	
	function toggle()
	{
		if (!enabled) enable();
		else disable();
	}
	
	function updateListeners()
	{
		if (enabled) {
			$(DocumentManager).on('currentDocumentChange.wdMinimap', documentSwitch);
			$(DocumentManager).on('workingSetRemove.wdMinimap', documentClose);
			$('#wdMinimap pre, #wdMinimap .visible-box').on('mousedown.wdMinimap', visibleBoxMouseDown);
			$(document).on('mouseup.wdMinimap', visibleBoxMouseUp);
			$('#wdMinimap pre, #wdMinimap .visible-box').on('mousemove.wdMinimap', visibleBoxMouseMove);
		}
		else {
			if (currentEditor) $(currentEditor.document).off('.wdMinimap');
			$(DocumentManager).off('.wdMinimap');
			$(document).off('.wdMinimap');
		}
	}
		
	function documentSwitch() 
	{
		if (hidden) show();
		
		if (currentEditor) {
			$(currentEditor.document).off('.wdMinimap');
		}
		
		currentEditor = EditorManager.getCurrentFullEditor();
		if (!currentEditor) { 
			$('#wdMinimap').hide(); 
			return;
		}
		else {
			$('#wdMinimap').show();
		}
		
		$('#wdMinimap pre').css('top', 0);
		documentEdit();
		
		$(currentEditor.document).on('change.wdMinimap', documentEdit);
		$(currentEditor).on('scroll.wdMinimap', editorScroll);
	}
	
	function documentClose()
	{
		if (DocumentManager.getWorkingSet().length == 0) hide();
	}
		
	function documentEdit() 
	{
		$('#wdMinimap pre').text(currentEditor.document.getText());
		editorScroll();
	}
	
	function editorScroll() 
	{
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
	
	function scrollTo(y) 
	{
		var adjustedY = y - parseInt($('#wdMinimap pre').css('top')); //Add the negative pixels of the top of pre
		adjustedY = adjustedY - $('#wdMinimap .visible-box').height()/2; //Subtract half of the visible box to center the cursor vertically on it
		adjustedY = adjustedY * 4; //Scale up to regular size
		currentEditor.setScrollPos( currentEditor.getScrollPos.x, Math.max(adjustedY, 0) );
	}
	
	function visibleBoxMouseDown(e) 
	{
		dragging = true; 
		scrollTo(e.pageY);
	}
	
	function visibleBoxMouseMove(e)
	{
		if (dragging) {
			scrollTo(e.pageY);
			e.stopPropagation();
		}
	}
	
	function visibleBoxMouseUp()
	{
		dragging = false;
	}
	
	function editorResize()
	{
		editorScroll();
	}
	
	function setThemeColors()
	{
		var minimap = $('#wdMinimap');
		var pre = $('#wdMinimap pre');
		var editor = $('.CodeMirror');
		
		minimap.css('background-color', editor.css('background-color'));
		pre.css('color', editor.css('color'));
	}
	
	CommandManager.register('Show Minimap', NAME + 'showMinimap', toggle);
	menu.addMenuItem(NAME + 'showMinimap');
	
	if (enabled) enable();
	if (DocumentManager.getWorkingSet().length == 0) hide();
});