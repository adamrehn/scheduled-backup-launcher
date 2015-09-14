; Include the Modern UI 2 Header File
!include "MUI2.nsh"

; The name of the installer
Name "Scheduled Backup Launcher"

; The filename of the installer
OutFile "ScheduledBackupLauncher-win32-x64.exe"

; The installer icon
!define MUI_ICON "..\Resources\Icon.ico"

; Remove the default branding text
BrandingText " "

; The default installation directory
InstallDir "$PROGRAMFILES\Scheduled Backup Launcher"

; Request application privileges for Windows Vista and above
RequestExecutionLevel admin

; Default Settings
ShowInstDetails show
ShowUninstDetails show

;--------------------------------

; Installer Pages
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Version Settings
!define VERSION "this_string_is_filled_in_by_build.js"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductName" "Scheduled Backup Launcher Installer"
VIAddVersionKey /LANG=${LANG_ENGLISH} "Comments" "Scheduled Backup Launcher Installer"
VIAddVersionKey /LANG=${LANG_ENGLISH} "CompanyName" "Adam Rehn"
VIAddVersionKey /LANG=${LANG_ENGLISH} "LegalCopyright" "Copyright (C) 2011-2015, Adam Rehn"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileDescription" "Scheduled Backup Launcher Installer"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductVersion" ${VERSION}
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileVersion" ${VERSION}
VIProductVersion ${VERSION}

;--------------------------------

; Uninstaller instructions
Section "Uninstall"
	
	; No reboot required
	SetRebootFlag false
	
	; Delete the files, including the uninstaller itself
	RmDir /r $INSTDIR\locales
	RmDir /r $INSTDIR\resources
	Delete $INSTDIR\*.*
	
	; Delete the installation directory
	RMDir $INSTDIR

SectionEnd

; Installer instructions
Section ""
	
	; Set output path to the installation directory.
	SetOutPath $INSTDIR
	
	; Install the files
	File /r "Scheduled Backup Launcher-win32-x64\*.*"
	
	; Write the uninstaller
	WriteUninstaller $INSTDIR\uninstall.exe
	
SectionEnd
