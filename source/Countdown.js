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

function Countdown(duration)
{
	this.timeRemaining = duration;
	this.events = new EventEmitter();
}

Countdown.prototype.onTick = function(handler) {
	this.events.on('tick', handler);
}

Countdown.prototype.onComplete = function(handler) {
	this.events.on('complete', handler);
}

Countdown.prototype.delay = function(delayAmount)
{
	this.timeRemaining += delayAmount;
	this.events.emit('tick', this.timeRemaining);
}

Countdown.prototype.forceEnd = function(delayAmount)
{
	this.timeRemaining = 0;
	this.events.emit('tick', this.timeRemaining);
	this.events.emit('complete', '');
}

Countdown.prototype.tick = function(handler)
{
	if (this.timeRemaining > 0)
	{
		//Decrement the remaining time
		this.timeRemaining--;
		this.events.emit('tick', this.timeRemaining);
		
		//If the countdown has completed, emit an event
		if (this.timeRemaining == 0) {
			this.events.emit('complete', '');
		}
	}
}

module.exports = Countdown;