#!/usr/bin/env node
var execSync = require('child_process').execSync;

function remove(path, isRecursive)
{
	if (process.platform == 'win32') {
		execSync((isRecursive ? 'rmdir' : 'del /q') + ' "' + path.replace(/\//g, '\\') + '"' + (isRecursive ? '/s /q' : ''));
	}
	else {
		execSync('rm -f ' + (isRecursive ? '-R' : '') + ' "' + path + '"');
	}
}

remove(__dirname + '/build', true);
remove(__dirname + '/source/node_modules', true);
remove(__dirname + '/source/pages/images/icon.png', false);
remove(__dirname + '/source/pages/images/background.jpg', false);