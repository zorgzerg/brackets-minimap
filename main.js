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

define(function (require, exports, module) {
	require('runmode');
	var Config = require('Config');
	var MinimapMenus = require('MinimapMenus');

	var PreferencesManager = brackets.getModule('preferences/PreferencesManager');
	var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
	var DocumentManager = brackets.getModule('document/DocumentManager');
	var EditorManager = brackets.getModule('editor/EditorManager');
	var CommandManager = brackets.getModule('command/CommandManager');
	
	var preferences = PreferencesManager.getPreferenceStorage(Config.NAME, Config.defaultPreferences);    
	var currentEditor;
	var hidden = false;
	var dragging = false;
	var contentCssRight = 0;
	var resizeInterval;
	var editorHeight = 0;

	var minimapHtml = '\
		<div id="wdMinimap">\
	    		<div id="visible_box"></div>\
	    		<pre class="cm-s-default"></pre>\
		</div>\
	';

	function hide()
	{
		if (preferences.getValue('enabled')) {
			$('#wdMinimap').hide();
			$('.main-view .content').css('right', contentCssRight + 'px');
			hidden = true;
		}
	}
	
	function show()
	{
		$('#wdMinimap').show();
		$('.main-view .content').css('right', Config.MINIMAP_WIDTH + contentCssRight + 'px');		
		hidden = false;
	}
	
	function enable() 
	{		
		contentCssRight = parseInt($('.main-view .content').css('right'));
		$('.main-view').append(minimapHtml);
		$('.main-view .content').css('right', Config.MINIMAP_WIDTH + contentCssRight + 'px');		
		updateListeners();
		documentSwitch();
		
		resizeInterval = setInterval(function() {
			if (currentEditor) {
				if (editorHeight != $('#editor-holder').height()) {
					editorResize();
					editorHeight = $('#editor-holder').height();
				}
			}
			if ($('#wdMinimap').css('backgroundColor') != $('.CodeMirror').css('backgroundColor')) setThemeColors();
		}, 500);

	}
	
	function disable()
	{
		$('#wdMinimap').remove();
		$('.main-view .content').css('right', contentCssRight + 'px');
		updateListeners();
		
		clearInterval(resizeInterval);
	}

	function updateListeners()
	{
		if (preferences.getValue('enabled')) {
			$(DocumentManager).on('currentDocumentChange.wdMinimap', documentSwitch);
			$(DocumentManager).on('workingSetRemove.wdMinimap', documentClose);
			$('#wdMinimap').on('mousedown.wdMinimap', visibleBoxMouseDown);
			$(document).on('mouseup.wdMinimap', visibleBoxMouseUp);
			$('#wdMinimap').on('mousemove.wdMinimap', visibleBoxMouseMove);
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
		if (preferences.getValue('type') === 'plaintext') {
			$('#wdMinimap pre').text(currentEditor.document.getText());
		}
		else {
			var fileType = currentEditor.getModeForDocument();
			var editor = CodeMirror.runMode(currentEditor.document.getText(), "text/" + fileType, $('#wdMinimap pre').get(0));
			$('#wdMinimap pre').attr('class', $('#editor-holder .CodeMirror:visible').attr('class'));
		}
		editorScroll();
	}
	
	function editorScroll()
	{
		//currentEditor.getFirstVisibleLine() does not work
		//console.log(Math.floor(((currentEditor.getLastVisibleLine() - currentEditor.getFirstVisibleLine())/currentEditor.lineCount())*100));
		
		var scroller = $('#editor-holder .CodeMirror:visible .CodeMirror-scroll');
		var pre = $('#wdMinimap pre');
		var visBox = $('#wdMinimap #visible_box');
		
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
		adjustedY = adjustedY - $('#wdMinimap #visible_box').height()/2; //Subtract half of the visible box to center the cursor vertically on it
		adjustedY = adjustedY * 4; //Scale up to regular size
		currentEditor.setScrollPos( currentEditor.getScrollPos.x, Math.max(adjustedY, 0) );
	}
	
	function visibleBoxMouseDown(e) 
	{
		if (e.button === 0) {
			dragging = true; 
			scrollTo(e.pageY);
		}
		else if (e.button === 2) {
			MinimapMenus.openContextMenu(e.clientX, e.clientY);
		}
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
		var visBox = $('#wdMinimap #visible_box');
		
		minimap.css('backgroundColor', editor.css('backgroundColor'));
		pre.css('color', editor.css('color'));
        
		var pos_neg = 1;
		if (lightColor(minimap.css('backgroundColor'))) pos_neg = -1;
		visBox.css('backgroundColor', shadeColor(minimap.css('backgroundColor'), pos_neg * 20));
		minimap.css('borderLeftColor', shadeColor(minimap.css('backgroundColor'), pos_neg * 10));
	}
    


	
    
	//http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
	function shadeColor(color, percent) 
	{   
		color = color.replace(/#/,'');
		var num = parseInt(color,16),
		amt = Math.round(2.55 * percent),
		R = (num >> 16) + amt,
		B = (num >> 8 & 0x00FF) + amt,
		G = (num & 0x0000FF) + amt;
		return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
	}

	function lightColor(color) 
	{
		color = color.replace(/#/,'');
		var num = parseInt(color,16),
		R = (num >> 16),
		B = (num >> 8 & 0x00FF),
		G = (num & 0x0000FF);
		L = 0.2*R + 0.7*G + 0.1*B;
		return (L/255.0 > 0.5);
	}
    
	$.cssHooks.backgroundColor = {
		get: function(elem) {
			if (elem.currentStyle)
				var bg = elem.currentStyle["backgroundColor"];
			else if (window.getComputedStyle)
				var bg = document.defaultView.getComputedStyle(elem, null).getPropertyValue("background-color");

			if (bg.search("rgb") == -1)
				return bg;
			else {
				bg = bg.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
				function hex(x) { return ("0" + parseInt(x).toString(16)).slice(-2); }
				return "#" + hex(bg[1]) + hex(bg[2]) + hex(bg[3]);
			}
		}
	}   
	
	ExtensionUtils.loadStyleSheet(module, 'main.css');
	MinimapMenus.addToViewMenu();
	MinimapMenus.createContextMenu();   

	$(MinimapMenus).on('showMinimap', enable);
	$(MinimapMenus).on('hideMinimap', disable);
	
	if (preferences.getValue('enabled')) enable();
	if (DocumentManager.getWorkingSet().length == 0) hide();

});
