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
	var Config = require('Config');

	var Menus = brackets.getModule('command/Menus');
	var CommandManager = brackets.getModule('command/CommandManager');
	var PreferencesManager = brackets.getModule('preferences/PreferencesManager');

	var $exports = $(exports);
	var contextMenu = Menus.registerContextMenu('minimap-context-menu');

	function createContextMenu()
	{
		//contextMenu
		CommandManager.register('Plain Text', Config.NAME + 'displayPlainText', _cmDisplayPlainText);
		CommandManager.register('CodeMirror', Config.NAME + 'displayCodeMirror', _cmDisplayCodeMirror);
		contextMenu.addMenuItem(Config.NAME + 'displayPlainText');
		contextMenu.addMenuItem(Config.NAME + 'displayCodeMirror');
	}

	function openContextMenu(x, y)
	{
		contextMenu.open({ pageX: x, pageY: y });
	}

	function _cmDisplayPlainText()
	{
        PreferencesManager.set('type', 'plaintext');
		$(exports).trigger('changedDisplayType', 'plaintext');
	}

	function _cmDisplayCodeMirror()
	{
		PreferencesManager.set('type', 'codemirror');
		$(exports).trigger('changedDisplayType', 'codemirror');
	}

	function addToViewMenu()
	{
		var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
		CommandManager.register('Show Minimap', Config.NAME + 'showMinimap', _viewShowMinimap);
		viewMenu.addMenuItem(Config.NAME + 'showMinimap');
        if (PreferencesManager.get('enabled')) CommandManager.get(Config.NAME + 'showMinimap').setChecked(true);
	}

	function _viewShowMinimap()
	{
        if (!PreferencesManager.get('enabled')) {
			PreferencesManager.set('enabled', true);
			CommandManager.get(Config.NAME + 'showMinimap').setChecked(true);
			$(exports).trigger('showMinimap');
		}
		else {
			PreferencesManager.set('enabled', false);
			CommandManager.get(Config.NAME + 'showMinimap').setChecked(false);
			$(exports).trigger('hideMinimap');
		}
	}

	exports.createContextMenu = createContextMenu;
	exports.openContextMenu = openContextMenu;
	exports.addToViewMenu = addToViewMenu;
});
