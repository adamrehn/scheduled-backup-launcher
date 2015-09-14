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
var fs = require('fs');
var execSync = require('child_process').execSync;

//Generates the list of default tools for the current platform,
//based on which tools could be detected as currently installed
function DefaultTools()
{
	this.tools = {};
	this.detectRsync();
	this.detectSyncBack();
}

DefaultTools.prototype.getTools = function() {
	return this.tools;
}

//Helper function to add a tool to the list
DefaultTools.prototype.addTool = function(toolName, command, defaultArgs)
{
	this.tools[toolName] = {
		'command':     command,
		'defaultArgs': (defaultArgs !== undefined) ? defaultArgs : ''
	};
}

//Helper function to detect if a given executable exists in the PATH
DefaultTools.prototype.executableInPath = function(executable)
{
	//Both `where` and `which` return a non-zero exit code when the executable could not be found
	//Handily, execSync will throw when a non-zero exit code is encountered:
	//<https://nodejs.org/api/child_process.html#child_process_child_process_execsync_command_options>
	try
	{
		var detectCommand = ((process.platform == 'win32') ? 'where ' : 'which ') + executable;
		execSync(detectCommand, {stdio: ['ignore', 'ignore', 'ignore']});
		return true;
	}
	catch (e) {
		return false;
	}
}

//Helper function to add a tool if its executable exists in the path
DefaultTools.prototype.addToolIfInPath = function(toolName, executable, defaultArgs)
{
	if (this.executableInPath(executable)) {
		this.addTool(toolName, executable, defaultArgs);
	}
}

//Helper function to add a tool if its executable exists in one of the supported filesystem locations
DefaultTools.prototype.addToolIfInSupportedLocation = function(toolName, suppportedLocations, defaultArgs)
{
	for (var i = 0; i < suppportedLocations.length; ++i)
	{
		if (fs.existsSync(suppportedLocations[i]))
		{
			this.addTool(toolName, '"' + suppportedLocations[i] + '"', defaultArgs);
			break;
		}
	}
}

//Tool-specific detection routines

//Detects rsync <https://rsync.samba.org/>
DefaultTools.prototype.detectRsync = function(tools) {
	this.addToolIfInPath('rsync', 'rsync');
}

//Detects SyncBack <http://www.2brightsparks.com/syncback/>
DefaultTools.prototype.detectSyncBack = function(tools)
{
	if (process.platform == 'win32')
	{
		this.addToolIfInSupportedLocation('SyncBack', [
			'C:\\Program Files (x86)\\2BrightSparks\\SyncBack\\SyncBack.exe',
			'C:\\Program Files\\2BrightSparks\\SyncBack\\SyncBack.exe'
		], '-m');
	}
}

module.exports = DefaultTools;