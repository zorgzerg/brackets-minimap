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

/*global define, brackets, $*/
/*jslint nomen: true, vars: true */
define(function (require, exports, module) {
    'use strict';

	var
        Config = require('Config'),
        Menus = brackets.getModule('command/Menus'),
        CommandManager = brackets.getModule('command/CommandManager'),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
        PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
        //contextMenu = Menus.registerContextMenu('minimap-context-menu'),
        Prefs = PreferencesManager.getExtensionPrefs(Config.NAME);

//	function openContextMenu(x, y) {
//		contextMenu.open({ pageX: x, pageY: y });
//	}

//	function _cmDisplayPlainText() {
//        PreferencesManager.set('type', 'plaintext');
//		$(exports).trigger('changedDisplayType', 'plaintext');
//	}

//    function _cmDisplayCodeMirror() {
//		PreferencesManager.set('type', 'codemirror');
//		$(exports).trigger('changedDisplayType', 'codemirror');
//	}

//    function createContextMenu() {
//		//contextMenu
//		CommandManager.register('Plain Text', Config.NAME + 'displayPlainText', _cmDisplayPlainText);
//		CommandManager.register('CodeMirror', Config.NAME + 'displayCodeMirror', _cmDisplayCodeMirror);
//		contextMenu.addMenuItem(Config.NAME + 'displayPlainText');
//		contextMenu.addMenuItem(Config.NAME + 'displayCodeMirror');
//	}

	function _toggle() {
        var
            state = !Prefs.get("enabled");

        CommandManager.get(Config.NAME + 'showMinimap').setChecked(state);
        Prefs.set("enabled", state);
        Prefs.save();
	}

    function init() {
		var
            viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);

		CommandManager.register('Show Minimap', Config.NAME + 'showMinimap', _toggle);
        KeyBindingManager.addBinding(Config.NAME + 'showMinimap', "Ctrl-`");

		viewMenu.addMenuItem(Config.NAME + 'showMinimap');
        if (Prefs.get("enabled")) {
            CommandManager.get(Config.NAME + 'showMinimap').setChecked(true);
        }
	}

	//exports.createContextMenu = createContextMenu;
	//exports.openContextMenu = openContextMenu;
	exports.init = init;
});
