#!/bin/bash

#Rebuild
#cordova clean || exit 1
cordova build

#Open the app (with the new plugin in use) on the USB-connected device
adb -d install -r ./platforms/android/build/outputs/apk/debug/android-debug.apk || exit 1
adb -d shell am start -a android.intent.action.MAIN -n io.cordova.hellocordova/.MainActivity
adb -d logcat > log.txt
vim log.txt
