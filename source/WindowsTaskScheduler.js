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
var EventEmitter = require('events').EventEmitter;
var elevate      = require('../node-windows').elevate;
var parseXml     = require('xml2js').parseString;
var exec         = require('child_process').exec;
var parseCsv     = require('csv-parse');
var Promise      = require('promise');
var mod          = require('mod-op');
var Utility      = require('./Utility.js');
var remote       = require('remote');

function WindowsTaskScheduler(numRounds, readyHandler)
{
	this.numRounds = numRounds;
	this.events = new EventEmitter();
	
	//If a ready-event handler was supplied, register it
	if (readyHandler !== undefined) {
		this.ready(readyHandler);
	}
	
	this.events.emit('ready', this);
}

WindowsTaskScheduler.prototype.ready = function(handler) {
	this.events.on('ready', handler);
}

WindowsTaskScheduler.prototype.saved = function(handler) {
	this.events.on('saved', handler);
}

WindowsTaskScheduler.prototype.error = function(handler) {
	this.events.on('error', handler);
}

//Retrieves the existing scheduling details (if any) for the backup rounds
WindowsTaskScheduler.prototype.getScheduledRounds = function(callback)
{
	//Retrieve the list of existing jobs
	var that = this;
	var pattern = /\\Scheduled Backup Launcher Round (.+)/;
	this.listTasksMatchingPattern(pattern, function(tasks)
	{
		//Retrieve the details of each of the jobs
		Promise.all(tasks.map(that.getTaskDetails, that)).then(function(result)
		{
			//Build the mapping from round number to schedule details
			var roundSchedules = {};
			result.forEach(function(task)
			{
				if (task !== null)
				{
					var roundNum = pattern.exec(task.name)[1];
					roundSchedules[roundNum] = task;
				}
			});
			
			callback(roundSchedules);
			
		}).catch(function(err) {
			that.events.emit('error', err);
		});
	});
}

//Removes any existing jobs, and creates new jobs using the specified details
WindowsTaskScheduler.prototype.schedule = function(roundSchedules)
{
	//Remove any existing jobs before we create the new ones
	var that = this;
	this.removeExistingJobs(function()
	{
		//Iterate over the details for each round
		var promises = [];
		Object.keys(roundSchedules).forEach(function(roundNum)
		{
			//Add the promise for the task creation to our list
			var details = roundSchedules[roundNum];
			promises.push(that.createTask('Scheduled Backup Launcher Round ' + roundNum, '"' + Utility.wrapInQuotes(remote.process.argv[0]).replace(/"/g, '\\"') + ' ' + roundNum + '"', details));
		});
		
		//Wait until all of the promises are completed
		Promise.all(promises).then(function(result) {
			that.events.emit('saved');
		}).catch(function(err) {
			that.events.emit('error', err);
		});
	});
}

//Removes any existing scheduled jobs for backup rounds
WindowsTaskScheduler.prototype.removeExistingJobs = function(callback)
{
	//Retrieve the list of existing jobs
	var that = this;
	this.getScheduledRounds(function(schedule)
	{
		//Attempt to delete each of the jobs
		var tasks = Object.keys(schedule).map(function(round){ return schedule[round]; });
		Promise.all(tasks.map(that.deleteTask, that)).then(function(result) {
			callback();
		}).catch(function(err) {
			that.events.emit('error', err);
		});
	});
}

//Lists the tasks whose names match the specified regex pattern
WindowsTaskScheduler.prototype.listTasksMatchingPattern = function(pattern, callback)
{
	//Query the Windows Task Scheduler
	var that = this;
	exec('schtasks /Query /FO csv', function(error, stdout, stderr)
	{
		//If the query failed, report the error
		if (error !== null)
		{
			that.events.emit('error', error);
			return;
		}
		
		//Parse the CSV output
		parseCsv(stdout, function(err, result)
		{
			//If parsing failed, report the error
			if (err !== null)
			{
				that.events.emit('error', err);
				return;
			}
			
			//Extract the list of task names
			var nameColumn = result[0].indexOf('TaskName');
			var taskNames = result.slice(1).map(function(entry) {
				return entry[ nameColumn ];
			});
			
			//Match the names against the supplied pattern
			var matchingTasks = taskNames.filter(function(taskName) {
				return (taskName != 'TaskName' && taskName.match(pattern));
			});
			
			callback(matchingTasks);
		});
	});
}

//Returns a promise for creating a new scheduled task
WindowsTaskScheduler.prototype.createTask = function(taskName, command, details)
{
	return new Promise(function (resolve, reject)
	{
		//Determine what type of task we are scheduling
		var createCommand = 'schtasks /Create /f /tn "' + taskName + '" /tr ' + command + ' ';
		if (details.type == 'daily')
		{
			//Daily schedule
			createCommand += '/sc daily /st ' + Utility.padToDigits(details.hour, 2) + ':' + Utility.padToDigits(details.minute, 2);
		}
		else if (details.type == 'weekly')
		{
			//Weekly schedule
			createCommand += '/sc weekly /d ' + details.day.substr(0,3).toUpperCase() +
				' /st ' + Utility.padToDigits(details.hour, 2) + ':' + Utility.padToDigits(details.minute, 2);
		}
		else if (details.type == 'login')
		{
			//Run at login
			createCommand += '/sc onlogon';
		}
		
		//When creating login tasks, we need to elevate the command
		var execVariant = ((details.type == 'login') ? elevate : exec);
		
		//Attempt to create the task
		execVariant(createCommand, function(error, stdout, stderr)
		{
			if (error !== null) {
				reject({'error':error,'stdout':stdout,'stderr':stderr});
			}
			else {
				resolve(true);
			}
		});
	});
}

//Returns a promise for deleting scheduled task
WindowsTaskScheduler.prototype.deleteTask = function(taskDetails)
{
	return new Promise(function (resolve, reject)
	{
		//When deleting login tasks, we need to elevate the command
		var execVariant = ((taskDetails.type == 'login') ? elevate : exec);
		
		//Attempt to delete the specified task
		execVariant('schtasks /Delete /f /tn "' + taskDetails.name + '"', function(error, stdout, stderr)
		{
			if (error !== null) {
				reject({'error':error,'stdout':stdout,'stderr':stderr});
			}
			else {
				resolve(true);
			}
		});
	});
}

//Returns a promise for retrieving the scheduling details for the specified task
WindowsTaskScheduler.prototype.getTaskDetails = function(taskName)
{
	return new Promise(function (resolve, reject)
	{
		//Query the Windows Task Scheduler
		exec('schtasks /Query /XML ONE /tn "' + taskName + '"', function(error, stdout, stderr)
		{
			//If the query failed, report the error
			if (error !== null)
			{
				reject(error);
				return;
			}
			
			//Parse the XML output
			parseXml(stdout, function(err, result)
			{
				//If parsing failed, report the error
				if (err !== null)
				{
					reject(error);
					return;
				}
				
				//Determine if the task has a login-based trigger or a calendar-based trigger
				var taskDetails = null;
				if (result['Task']['Triggers'] !== undefined && result['Task']['Triggers'][0]['LogonTrigger'] !== undefined)
				{
					taskDetails = {
						'name':   taskName,
						'type':   'login',
						'hour':   null,
						'minute': null,
						'day':    null
					};
				}
				else if (result['Task']['Triggers'] !== undefined && result['Task']['Triggers'][0]['CalendarTrigger'] !== undefined)
				{
					//Extract the hours and minutes fields
					var calendarTrigger = result['Task']['Triggers'][0]['CalendarTrigger'][0];
					var startBoundary   = new Date(calendarTrigger['StartBoundary'][0]);
					var hours           = mod(startBoundary.getHours()   + (startBoundary.getTimezoneOffset() / 60), 24);
					var minutes         = mod(startBoundary.getMinutes() + (startBoundary.getTimezoneOffset() % 60), 60);
					
					//Determine what type of schedule the task has
					if (calendarTrigger['ScheduleByDay'] !== undefined)
					{
						//Daily task
						taskDetails = {
							'name':   taskName,
							'type':   'daily',
							'hour':   hours,
							'minute': minutes,
							'day':    null
						};
					}
					else if (calendarTrigger['ScheduleByWeek'] !== undefined)
					{
						//Weekly task
						taskDetails = {
							'name':   taskName,
							'type':   'weekly',
							'hour':   hours,
							'minute': minutes,
							'day':    (Object.keys(calendarTrigger['ScheduleByWeek'][0]['DaysOfWeek'][0]))[0]
						};
					}
				}
				
				//Resolve the promise with the result
				resolve(taskDetails);
			});
		});
	});
}

module.exports = WindowsTaskScheduler;