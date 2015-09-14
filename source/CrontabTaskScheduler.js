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
var LoginItemManagerFactory = require('./LoginItemManagerFactory.js');
var EventEmitter = require('events').EventEmitter;
var Utility = require('./Utility.js');
var remote = require('remote');

const WEEKDAY_MAPPINGS = {
	'mon': 'Monday',
	'tue': 'Tuesday',
	'wed': 'Wednesday',
	'thu': 'Thursday',
	'fri': 'Friday',
	'sat': 'Saturday',
	'sun': 'Sunday'
};

function CrontabTaskScheduler(numRounds, readyHandler)
{
	this.crontab = null;
	this.numRounds = numRounds;
	this.events = new EventEmitter();
	
	//If a ready-event handler was supplied, register it
	if (readyHandler !== undefined) {
		this.ready(readyHandler);
	}
	
	var that = this;
	require('crontab').load(function(err, crontab)
	{
		that.crontab = crontab;
		that.loginItems = LoginItemManagerFactory.createManager(function() {
			that.events.emit('ready', that);
		});
	});
}

CrontabTaskScheduler.prototype.ready = function(handler) {
	this.events.on('ready', handler);
}

CrontabTaskScheduler.prototype.saved = function(handler) {
	this.events.on('saved', handler);
}

CrontabTaskScheduler.prototype.error = function(handler) {
	this.events.on('error', handler);
}

//Retrieves the existing scheduling details (if any) for the backup rounds
CrontabTaskScheduler.prototype.getScheduledRounds = function(callback)
{
	var roundSchedules = {};
	for (var currRound = 0; currRound < this.numRounds; ++currRound)
	{
		var existingJobs = this.crontab.jobs({comment:'Scheduled Backup Launcher Round ' + currRound});
		if (existingJobs.length > 0)
		{
			var jobDetails = existingJobs[0];
			var day = jobDetails.dow().getEnum()[ parseInt(jobDetails.dow().toString()) ];
			
			roundSchedules[currRound] = {
				'name':   jobDetails.comment(),
				'type':   (day !== undefined) ? 'weekly' : 'daily',
				'hour':   parseInt(jobDetails.hour().toString()),
				'minute': parseInt(jobDetails.minute().toString()),
				'day':    (day !== undefined) ? WEEKDAY_MAPPINGS[day] : null
			};
		}
	}
	
	//Retrieve those rounds that are scheduled as login items
	var loginRounds = this.loginItems.getLoginRounds();
	loginRounds.forEach(function(roundNum)
	{
		roundSchedules[roundNum] = {
			'name':   'Scheduled Backup Launcher Round ' + roundNum,
			'type':   'login',
			'hour':   null,
			'minute': null,
			'day':    null
		};
	});
	
	callback(roundSchedules);
}

//Removes any existing jobs, and creates new jobs using the specified details
CrontabTaskScheduler.prototype.schedule = function(roundSchedules)
{
	//Remove any existing jobs
	this.removeExistingJobs();
	this.loginItems.removeExistingItems();
	
	//Iterate over the details for each round
	var that = this;
	Object.keys(roundSchedules).forEach(function(roundNum)
	{
		//Determine if the round is scheduled to run at login
		if (roundSchedules[roundNum].type == 'login') {
			that.loginItems.addItem(roundNum);
		}
		else
		{
			//Under Linux, we need to export the DISPLAY variable to run GUI applications
			//(Details from: <http://ubuntuforums.org/showthread.php?t=185993>)
			var command = Utility.wrapInQuotes(remote.process.argv[0]) + ' ' + roundNum + ' > /dev/null 2>&1';
			if (process.platform == 'linux') {
				command = 'export DISPLAY=:0 && ' + command;
			}
			
			//Create the job object
			var details = roundSchedules[roundNum];
			var job = that.crontab.create(command, '@' + details.type, 'Scheduled Backup Launcher Round ' + roundNum);
			
			//Set the hour
			job.hour().clear();
			job.hour().at(details.hour);
			
			//Set the minute
			job.minute().clear();
			job.minute().at(details.minute);
			
			//Unless it's a daily job, set the day of the week
			if (details.type != 'daily')
			{
				job.dow().clear();
				job.dow().on(details.day.substr(0, 3).toLowerCase());
			}
		}
	});
	
	//Commit the changes to the user's crontab file
	this.commitChanges();
}

//Commits any changes to the user's crontab file
CrontabTaskScheduler.prototype.commitChanges = function()
{
	var that = this;
	this.loginItems.commitChanges(function(liErr)
	{
		if (liErr !== null) {
			that.events.emit('error', liErr);
		}
		else
		{
			that.crontab.save(function(err, crontab)
			{
				if (err !== null) {
					that.events.emit('error', err);
				}
				else {
					that.events.emit('saved');
				}
			});
		}
	});
}

//Removes any existing scheduled jobs for backup rounds
CrontabTaskScheduler.prototype.removeExistingJobs = function()
{
	var that = this;
	var existingJobs = this.crontab.jobs({comment:/Scheduled Backup Launcher Round (.+)/});
	existingJobs.forEach(function(job) {
		that.crontab.remove(job);
	});
}

module.exports = CrontabTaskScheduler;