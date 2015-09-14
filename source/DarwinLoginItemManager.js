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
var Promise = require('promise');
var glob    = require('glob');
var fs      = require('fs');

function DarwinLoginItemManager(readyHandler)
{
	this.plistDir    = process.env['HOME'] + '/Library/LaunchAgents';
	this.plistPrefix = this.plistDir + '/com.adamrehn.scheduled-backup-launcher.round';
	this.loginRounds = [];
	
	//Determine which rounds have existing login items
	var that = this;
	glob(this.plistPrefix + '*.plist', function(err, files)
	{
		files.forEach(function(plistFile) {
			that.loginRounds.push(plistFile.replace(that.plistPrefix, '').replace('.plist', ''));
		});
		
		readyHandler();
	});
}

//Retrieves the list of rounds currently scheduled as login items
DarwinLoginItemManager.prototype.getLoginRounds = function() {
	return this.loginRounds;
}

//Clears the list of rounds to run at login
DarwinLoginItemManager.prototype.removeExistingItems = function() {
	this.loginRounds = [];
}

//Adds a round to the list of rounds to run at login
DarwinLoginItemManager.prototype.addItem = function(roundNum) {
	this.loginRounds.push(roundNum);
}

//Commits the list of login rounds to the filesystem
DarwinLoginItemManager.prototype.commitChanges = function(handler)
{
	var that = this;
	var createPlistFiles = function()
	{
		if (that.loginRounds.length > 0)
		{
			//Create plist files for the rounds to run at login
			Promise.all(that.loginRounds.map(that.createPlistFile, that)).then(function(result) {
				handler(null);
			}).catch(function(err) {
				handler(err);
			});
		}
		else {
			handler(null);
		}
	}
	
	//Delete all existing plist files before creating the new ones
	glob(this.plistPrefix + '*.plist', function(gErr, files)
	{
		if (files.length > 0)
		{
			Promise.all(files.map(that.deletePlistFile)).then(function(delResult) {
				createPlistFiles();	
			}).catch(function(delErr) {
				handler(delErr);
			});
		}
		else {
			createPlistFiles();
		}
	});
}

DarwinLoginItemManager.prototype.plistDataForRound = function(roundNum)
{
	return '<?xml version="1.0" encoding="UTF-8"?>\n' +
	'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
	'<plist version="1.0">\n' +
	'<dict>\n' +
	'    <key>Label</key>\n' +
	'    <string>com.adamrehn.scheduled-backup-launcher.round' + roundNum + '</string>\n' +
	'    <key>ProgramArguments</key>\n' +
	'    <array>\n' +
	'        <string>' + remote.process.argv[0] + '</string>\n' +
	'        <string>' + roundNum + '</string>\n' +
	'    </array>\n' +
	'	<key>RunAtLoad</key>\n' +
	'	<true/>\n' +
	'</dict>\n' +
	'</plist>';
}

DarwinLoginItemManager.prototype.deletePlistFile = function(plistPath)
{
	return new Promise(function (resolve, reject)
	{
		//Attempt to delete the specified plist file
		fs.unlink(plistPath, function(error)
		{
			if (error !== null) {
				reject(error);
			}
			else {
				resolve(true);
			}
		});
	});
}

DarwinLoginItemManager.prototype.createPlistFile = function(roundNum)
{
	var that = this;
	var plistPath = this.plistPrefix + roundNum + '.plist';
	return new Promise(function(resolve, reject)
	{
		//Attempt to create the plist file for the specified round
		fs.writeFile(plistPath, that.plistDataForRound(roundNum), function(error)
		{
			if (error !== null) {
				reject(error);
			}
			else {
				resolve(true);
			}
		});
	});
}

module.exports = DarwinLoginItemManager;