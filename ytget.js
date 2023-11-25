const fs = require('fs');
const ytdl = require('ytdl-core');
// TypeScript: import ytdl from 'ytdl-core'; with --esModuleInterop
// TypeScript: import * as ytdl from 'ytdl-core'; with --allowSyntheticDefaultImports
// TypeScript: import ytdl = require('ytdl-core'); with neither of the above
let Ref = 'https://youtu.be/lJlEQim-yMo?si=uYmqriqQhRtrPLpE';

ytdl.getInfo(Ref).then(info => {
//console.log(info.formats);
    //let audioFormats = ytdl.filterFormats(info.formats, 'audioonly'); console.log(audioFormats);
    let format = ytdl.chooseFormat(info.formats, {quality: 'highestaudio'});
    ytdl.downloadFromInfo(info, {quality: 'highestaudio'}).pipe(fs.createWriteStream('videooo.mp4'));
//    ytdl.downloadFromInfo(info, {filter: f => f.container === 'mp4' && f.mimeType.indexOf('audio/mp4') == 0}).pipe(fs.createWriteStream('video.mp4'));
    //ytdl(Ref, { filter: format => format.container === 'mp4', quality:'highestaudio'}).pipe(fs.createWriteStream('video.mp4'));
});

//let format = ytdl.chooseFormat(Ref, { filter: format => format.container === 'mp4' });
//format.pipe(fs.createWriteStream('video.mp4'));
