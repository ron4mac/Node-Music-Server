#!/usr/bin/bash
ZIPFILE="newversion.zip"
EXCLUDE="*/lib/config.js"
DFOLDER="update_folder"
UPFILES="update_folder/ron4mac-Node-Music-Server-"
TFOLDER="./"

unzip "$ZIPFILE" -x "$EXCLUDE" -d "$DFOLDER"
cp -a "$UPFILES"*/* "$TFOLDER"
rm -rf "$DFOLDER"
#rm "$ZIPFILE"
npm install
