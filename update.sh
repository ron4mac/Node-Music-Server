#!/usr/bin/bash
ZIPFILE="newversion.zip"
UPFILES="ron4mac-Node-Music-Server"
TFOLDER="./"

unzip -qq "$ZIPFILE" -x "*/update.sh" "*/lib/config.js" "*/lib/admin.js"
D=$(pwd)
for F in "$UPFILES"*; do
    U="$F"
done
cp -a "${D}/${U}/." "${D}/"
if [ $? -ne 0 ]; then
  echo "cp command failed!"
  # Handle the error, e.g., exit or log the error
fi
rm -rf "$U"
rm "$ZIPFILE"
npm install
echo "LIFE IS GOOD!"
