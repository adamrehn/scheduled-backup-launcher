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
var DefaultTools = require('./DefaultTools.js');
var mkdirp = require('mkdirp');
var fs = require('fs');

function ConfigurationManager()
{
	//The default (empty) config data
	this.config = {
		'tools': {},
		'rounds': []
	};
	
	//Parse the config file, if it exists
	this.parseConfigFile();
}

ConfigurationManager.prototype.getConfig = function() {
	return this.config;
}

ConfigurationManager.prototype.setConfig = function(newConfig)
{
	//If the config is valid, accept it and write it to the config file
	if (this.validateConfig(newConfig) == true)
	{
		this.config = newConfig;
		this.writeConfigFile();
	}
	else
	{
		//If we got to this point, something went wrong
		console.log('ERROR: INVALID CONFIG - ' + JSON.stringify(newConfig, true, 1));
	}
}

ConfigurationManager.prototype.configFilePath = function()
{
	//Determine the location of the config folder user's home directory
	var configDir = (
		(process.platform == 'win32') ?
		process.env['APPDATA'] :
		process.env['HOME'] + '/.config'
	) + '/scheduled-backup-launcher';
	
	//If the config dir doesn't exist, create it
	mkdirp.sync(configDir);
	
	//Return the full path to the config file
	return configDir + '/config.json';
}

ConfigurationManager.prototype.writeConfigFile = function() {
	fs.writeFileSync( this.configFilePath(), JSON.stringify(this.config, true, 1) );
}

ConfigurationManager.prototype.parseConfigFile = function()
{
	//Check if the config file exists
	var configFile = this.configFilePath();
	if (fs.existsSync(configFile))
	{
		try
		{
			//Attempt to parse the config JSON
			var configData   = fs.readFileSync(configFile);
			var parsedConfig = JSON.parse(configData);
			
			//If the config is valid, accept it
			if (this.validateConfig(parsedConfig) == true) {
				this.config = parsedConfig;
			}
		}
		catch (e) {
			//File permissions error, or malformed JSON
		}
	}
	else
	{
		//Add the default set of tools for the current platform to the config data
		var tools = new DefaultTools();
		this.config['tools'] = tools.getTools();
		
		//Write the default configuration data to the config file
		this.writeConfigFile();
	}
}

ConfigurationManager.prototype.validateConfig = function(config)
{
	//Verify that the parsed config data is valid
	var isValid = true;
	isValid = isValid && config['tools']  !== undefined;
	isValid = isValid && config['rounds'] !== undefined;
	isValid = isValid && Array.isArray(config['rounds']);
	
	//Validate each tool entry
	Object.keys(config['tools']).forEach(function(tool)
	{
		isValid = isValid && config['tools'][tool]['command']     !== undefined;
		isValid = isValid && config['tools'][tool]['defaultArgs'] !== undefined;
	});
	
	//Validate each round entry
	config['rounds'].forEach(function(round)
	{
		isValid = isValid && round['name']        !== undefined;
		isValid = isValid && round['description'] !== undefined;
		isValid = isValid && Array.isArray(round['items']);
		
		//Validate each item entry
		round['items'].forEach(function(item)
		{
			isValid = isValid && item['type']     !== undefined;
			isValid = isValid && item['name']     !== undefined;
			isValid = isValid && item['args']     !== undefined;
			isValid = isValid && item['terminal'] !== undefined;
			isValid = isValid && item['default']  !== undefined;
		});
	});
	
	return isValid;
}

module.exports = ConfigurationManager;