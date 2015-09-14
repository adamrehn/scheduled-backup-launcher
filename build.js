#!/usr/bin/env node
var executableInPath = require('./source/DefaultTools.js').prototype.executableInPath;
var spawnSync = require('child_process').spawnSync;
var execSync = require('child_process').execSync;
var fs = require('fs');

//Helper function to package for a given platform with electron-packager
function packageForPlatform(platform, electronVersion, extraArgs)
{
	try
	{
		execSync(
			'electron-packager ./source "Scheduled Backup Launcher" --out=./build --arch=x64' +
			' --platform=' + platform +
			' --version=' + electronVersion +
			' ' + extraArgs +
			' --asar --overwrite',
			{'stdio': ['inherit', 'inherit', 'inherit']}
		);
	}
	catch (e)
	{
		console.log('Error: failed to package using electron-packager!');
		process.exit(1);
	}
}

//Copies a file from one location to another
//(The XCOPY asterisk trick is from: <http://stackoverflow.com/a/14488464>)
function copyFile(sourceFile, destFile)
{
	if (process.platform == 'win32') {
		execSync('xcopy "' + sourceFile.replace(/\//g, '\\') + '" "' + destFile.replace(/\//g, '\\') + '*" /Y');
	}
	else {
		execSync('cp -f "' + sourceFile + '" "' + destFile + '"');
	}
}

//We require electron-packager and curl
var requiredTools = ['electron-packager', 'curl'];

//Make sure all of the required tools are in the PATH
var toolsPresent = requiredTools.map(function(tool) { return executableInPath(tool); });
var allPresent   = toolsPresent.reduce(function(prev, curr) { return prev && curr; });
if (!allPresent)
{
	console.log('Error! The following required tools were not found in the PATH:\n');
	console.log(requiredTools.filter(function(tool, index) { return toolsPresent[index] == false; }).join('\n'));
	process.exit(1);
}

//Use curl to determine the version number for the latest release of Electron
var devNull = ((process.platform == 'win32') ? 'NUL' : '/dev/null');
var electronBaseUrl  = 'https://github.com/atom/electron/releases/';
var curlResult       = spawnSync('curl', ['-Ls', '-o', devNull, '-w', '%{url_effective}', electronBaseUrl + 'latest']);
var latestRelease    = curlResult.stdout.toString().replace(electronBaseUrl + 'tag/v', '');
if (curlResult.status != 0)
{
	console.log('Error: failed to determine latest Electron release version!');
	process.exit(1);
}

//Determine our own version number
var appDetails = JSON.parse(fs.readFileSync(__dirname + '/source/package.json')); 
var appVersion = appDetails['version'];

//Use npm to install our dependencies
try {
	execSync('npm install .', {'cwd': __dirname + '/source', 'stdio': ['inherit', 'inherit', 'inherit']});
}
catch (e)
{
	console.log('Error: failed to install dependencies with npm!');
	process.exit(1);
}

//Copy the image files from the Resources directory
copyFile(__dirname + '/Resources/background.jpg', __dirname + '/source/pages/images/background.jpg');
copyFile(__dirname + '/Resources/Icon.png',       __dirname + '/source/pages/images/icon.png');

//The packaging options for each platform
var platformOptions = {
	'win32':  '--icon=./Resources/Icon.ico ' +
	          '--version-string.CompanyName="Adam Rehn" ' +
	          '--version-string.ProductName="Scheduled Backup Launcher" ' + 
	          '--version-string.FileDescription="Scheduled Backup Launcher" ' + 
	          '--version-string.OriginalFilename="Scheduled Backup Launcher.exe" ' +
	          '--version-string.LegalCopyright="Copyright (C) 2011-2015, Adam Rehn" ' +
	          '--version-string.ProductVersion="' + appVersion + '.0" ' +
	          '--version-string.FileVersion="' + appVersion + '.0"',
	
	'darwin': '--icon=./Resources/Icon.icns ' + 
	          '--app-bundle-id=com.adamrehn.scheduled-backup-launcher ' +
	          '--app-version="' + appVersion + '"',
	
	'linux':  ''
};

//Package for the current platform
//(Darwin builds fail under Windows due to missing symlink support, and Windows builds under other platforms
// require Wine for editing Windows executables, so a host-only build is the simplest option.)
packageForPlatform(process.platform, latestRelease, platformOptions[process.platform]);

//Remove the Electron license and version files
var outputDir = './build/Scheduled Backup Launcher-' + process.platform + '-x64';
execSync('rm -f "' + outputDir + '/version"');
execSync('rm -f "' + outputDir + '/LICENSE"');

//Perform any platform-specific post-packaging tasks
if (process.platform == 'win32')
{
	//Under Windows, copy the node-windows module to a location outside of app.asar
	var sourceFile = __dirname + '/source/node_modules/node-windows';
	var destFile   = __dirname + '/' + outputDir.replace('./build', 'build') + '/resources/node-windows/';
	execSync('xcopy "' + sourceFile.replace(/\//g, '\\') + '" "' + destFile.replace(/\//g, '\\') + '" /e /Y');
	
	//If makensis is in the path, build the Windows installer
	if (executableInPath('makensis'))
	{
		//Copy the installer NSIS script to the build folder, filling in the version number
		var nsisScript = fs.readFileSync(__dirname + '/Resources/windows-installer.nsi', {'encoding':'utf8'});
		nsisScript = nsisScript.replace('this_string_is_filled_in_by_build.js', appVersion + '.0');
		fs.writeFileSync(__dirname + '/build/windows-installer.nsi', nsisScript);
		
		//Build the installer
		execSync('makensis windows-installer.nsi', {'cwd':__dirname + '/build', 'stdio': ['inherit', 'inherit', 'inherit']});
	}
}
if (process.platform == 'darwin')
{
	//Under Mac OS X, create a .dmg image file
	execSync('ln -s /Applications "' + outputDir + '/Applications"');
	execSync('hdiutil create -volname "Scheduled Backup Launcher" -srcfolder "' + outputDir + '" -ov -format UDZO ./build/ScheduledBackupLauncher-darwin-x64.dmg');
	execSync('rm -f "' + outputDir + '/Applications"');
}
else
{
	//If zip is in the PATH, create a zip archive
	if (executableInPath('zip')) {
		execSync('zip -r9 ../ScheduledBackupLauncher-' + process.platform + '-x64.zip *', {'cwd':outputDir, 'stdio': ['inherit', 'inherit', 'inherit']});
	}
}

//All done!
console.log('Done. The packaged build has been generated in the directory ./build');
