Scheduled Backup Launcher
=========================

Scheduled Backup Launcher is a tool designed to help manage a backup workflow built around groups of highly granular backup tasks. Unlike typical automated backup workflows, the workflow provided by this tool allows the user to optionally review the items that will executed, enabling or disabling them for that run only. This provides an extra level of control for users who want a central interface from which to launch potentially large numbers of granular backup tasks, either on demand or via an automated job.

The ability to execute arbitrary commands also makes this tool surprisingly useful for a number of non-backup related use cases where a central group-based command launcher proves to be a valuable workflow tool.

**Features:**

- Define an arbitrary number of backup rounds, each containing an arbitrary number of backup items.
- Backup items can be defined to invoke any external backup tool that has a command-line interface. (Or any arbitrary command, of course.)
- Backup items can be set to open in a new Terminal/Command Prompt window, making it possible to monitor the progress of any purely CLI tools that are invoked.
- Checkboxes facilitate selecting a subset of the items in a round, whilst a countdown-based delay gives you time to review the selected items before they are run.
- The program accepts a single command-line argument that specifies the zero-based index of the backup round to run. This allows backup rounds to be invoked by automated jobs.


Installation and use
--------------------

The latest version of Scheduled Backup Launcher can be downloaded from the [**releases**](https://github.com/adamrehn/scheduled-backup-launcher/releases) page.

When you run the program for the first time, you will be presented with the configuration window. From here, you can define the commands used to invoke external backup tools, and edit the list of backup rounds. Each backup round has a button to open another window, which will let you edit the list of backup items in that round.

On subsequent runs of the program, you will be presented with the main window, which displays the list of backup rounds. Selecting one will open a window with the list of backup items for that round. After a default delay of 60 seconds (which can be incremented), those backup items whose checkboxes are ticked will be run.


Building from source
--------------------

The build process requires the following tools in the system PATH:

- [io.js](https://iojs.org/) and its version of npm
- [electron-packager](https://github.com/maxogden/electron-packager)
- [curl](http://curl.haxx.se/)

To build, simply run:

```
iojs build.js
```

To build the Windows installer, you will need [the 64-bit version of NSIS](https://bitbucket.org/dgolub/nsis64) in the system PATH. So long as `makensis` is detected in the PATH, the installer will be built automatically.


License
-------

Scheduled Backup Launcher is licensed under the MIT License. See the file [LICENSE](./LICENSE) for details.

Binary distributions of Scheduled Backup Launcher include [Electron](https://github.com/atom/electron). Electron is licensed under the MIT License.

The web font [Open Sans](https://www.google.com/fonts/specimen/Open+Sans) is included in both the source and binary distributions of Scheduled Backup Launcher. Open Sans is licensed under the [Apache License, version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html).

Background artwork is Copyright &copy; 2012 Emma Rehn, and is used with permission.

Icon designed by Sayuri Nagata.
