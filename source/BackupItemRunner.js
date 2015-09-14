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
var execFile = require('child_process').execFile;
var exec     = require('child_process').exec;
var Utility  = require('./Utility.js');
var dialog   = require('dialog');
var app      = require('app');
var tmp      = require('tmp');
var fs       = require('fs');

function BackupItemRunner() {}

BackupItemRunner.runItems = function(config, roundIndex, itemIndices)
{
	//Iterate over each of the backup items to be run
	var tools = config.tools;
	var items = config.rounds[roundIndex].items;
	itemIndices.forEach(function(itemIndex)
	{
		//Determine whether the item is a custom command
		var item = items[itemIndex];
		var command = '';
		if (item.type == 'Custom Command') {
			command = item.args;
		}
		else
		{
			//Verify that the specified tool is in our list
			var tool = tools[item.type];
			if (tool !== undefined)
			{
				//Build the command string
				command = Utility.wrapInQuotes(tool.command) + ' ' + tool.defaultArgs + ' ' + item.args;
			}
			else
			{
				dialog.showErrorBox('Error', 'Invalid item type: "' + item.type + '"');
				app.quit();
			}
		}
		
		//Invoke the command for the item
		if (item.terminal == true) {
			BackupItemRunner.runInTerminal(command);
		}
		else {
			exec(command);
		}
	});
	
	//Under Windows, it's evidently necessary to give child processes time to get started before the parent exits
	if (process.platform == 'win32') {
		require('sleep').sleep(1);
	}
}

BackupItemRunner.runInTerminal = function(command)
{
	//Determine which platform we are running under
	if (process.platform == 'darwin')
	{
		//Under Mac OS X, there doesn't appear to be any easy way to achieve the
		//desired outcome without the use of a temporary shell script
		
		//Create a temporary script path, and a self-deleting shell script
		var scriptPath = tmp.tmpNameSync({template: '/tmp/tmp-XXXXXX.sh'});
		var tempScript = '#!/bin/sh\necho\necho Command:\n\necho ' + command + '\necho\n' + command + '\nrm $0';
		
		//Create the shell script file, and make it executable
		fs.writeFileSync(scriptPath, tempScript);
		fs.chmodSync(scriptPath, '777');
		
		//We can spawn a terminal window by opening the shell script with Terminal.app
		exec('open -b com.apple.terminal "' + scriptPath + '"');
	}
	else if (process.platform == 'win32') {
		exec('start C:\\Windows\\system32\\cmd.exe /c ' + command);
	}
	else {
		exec('x-terminal-emulator -e ' + command);
	}
}

module.exports = BackupItemRunner;