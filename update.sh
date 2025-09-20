#!/usr/bin/bash
unzip newversion -x */lib/config.js -d update_folder
cp -a update_folder/*/* ./
rm -rf update_folder
rm newversion.zip
npm install
