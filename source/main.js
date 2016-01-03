/*
//  Scheduled Backup Launcher
//  Copyright (c) 2011-2015, Adam Rehn
//  
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//  
//  The above copyright notice and this permission notice shall be included in all
//  copies or substantial portions of the Software.
//  
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//  SOFTWARE.
*/
var ConfigurationManager = require('./ConfigurationManager.js');
var BackupItemRunner     = require('./BackupItemRunner.js');
var app                  = require('electron').app;
var BrowserWindow        = require('electron').BrowserWindow;
var ipc                  = require('electron').ipcMain;
var path                 = require('path');
var appIcon              = __dirname + '/pages/images/icon.png';

//Maintain a reference to the main window to prevent it being freed prematurely
var mainWindow = null;

//Quit when all browser windows are closed
app.on('window-all-closed', function() {
	app.quit();
});

//Parse the config file
var config = new ConfigurationManager();

//Loads the specified page in the main window
function loadPage(mainWindow, page)
{
	if (mainWindow !== null)
	{
		mainWindow.hide();
		mainWindow.loadURL('file://' + __dirname + '/pages/' + page + '.html');
	}
}

//Closes the config window
function closeConfigWindow()
{
	//Determine if any backup rounds have been defined
	if (config.getConfig()['rounds'].length > 0)
	{
		//Open the list of rounds
		loadPage(mainWindow, 'rounds');
	}
	else
	{
		//Quit the application
		mainWindow.close();
	}
}

//Opens the items window for the specified round
function showRound(roundIndex)
{
	loadPage(mainWindow, 'items');
	mainWindow.webContents.once('did-stop-loading', function() {
		mainWindow.webContents.send('load-items', roundIndex);
	});
}

//Wait until Electron has completed startup initialisation
app.on('ready', function()
{
	//Register our IPC responders
	ipc.on('show-config', function(event, arg)
	{
		//Open the config window
		loadPage(mainWindow, 'config');
	});
	
	ipc.on('get-config', function(event, arg) {
		event.returnValue = config.getConfig();
	});
	
	ipc.on('save-config', function(event, arg)
	{
		//Retrieve the new configuration values passed back through the IPC message
		var newConfig = arg;
		
		//Reformat the rounds into the correct form
		newConfig.rounds.forEach(function(round) {
			round.items = ((round.items.length > 0) ? JSON.parse(round.items) : []);
		});
		
		//Reformat the tools into the correct form
		var tools = newConfig.tools;
		newConfig.tools = {};
		tools.forEach(function(tool)
		{
			newConfig.tools[ tool.name ] = {
			    'command':     tool.command,
			    'defaultArgs': tool.defaultArgs
			}
		});
		
		//Save the new config and close the config window
		config.setConfig(newConfig);
		closeConfigWindow();
	});
	
	ipc.on('close-config', function(event, arg) {
		closeConfigWindow();
	});
	
	ipc.on('show-round', function(event, arg)
	{
		if (arg !== undefined && arg !== null)
		{
			//Open the items window for the specified round
			showRound(arg);
		}
	});
	
	ipc.on('run-items', function(event, arg)
	{
		//Executed the selected items (if any)
		mainWindow.hide();
		if (arg.items.length > 0) {
			BackupItemRunner.runItems(config.getConfig(), arg.round, arg.items);
		}
		
		mainWindow.close();
		app.quit();
	});
	
	//Create the main browser window
	mainWindow = new BrowserWindow({
		'width':          520,
		'height':         1,
		'center':         true,
		'show':           false,
		'resizable':      false,
		'fullscreen':     false,
		'useContentSize': true,
		'icon':           appIcon,
		'webPreferences': {
			'overlayScrollbars': false
		}
	});
	
	//Make sure we release our reference to the main window when it is closed
	mainWindow.on('closed', function() {
		mainWindow = null;
	});
	
	//Determine if a backup round has been specified on the command line
	var requestedRound = ((process.argv.length > 1) ? parseInt(process.argv[1]) : NaN);
	if (!isNaN(requestedRound) && requestedRound >= 0)
	{
		//Open the items window for the specified round
		showRound(requestedRound);
	}
	else
	{
		//Determine if any backup rounds have been defined
		if (config.getConfig()['rounds'].length > 0)
		{
			//Open the list of rounds
			loadPage(mainWindow, 'rounds');
		}
		else
		{
			//Open the config window
			loadPage(mainWindow, 'config');
		}
	}
});
