const readline = require('readline').createInterface({input: process.stdin, output: process.stdout});
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');

var tlist = [];

const emptyDir = (dir) => {
	fs.readdir(dir, (err, files) => {
		if (err) throw err;
		for (const file of files) {
			fs.unlink(path.join(dir, file), (err) => {
				if (err) throw err;
			});
		}
	});
}

const getTrack = (trk) => {
	//console.log(trk.shortUrl);
	console.log(trk.index,trk.title);
	ytdl.getInfo(trk.shortUrl).then(info => {
		ytdl.downloadFromInfo(info, {quality: 'highestaudio'}).pipe(fs.createWriteStream('playlist/'+trk.title+'.mp4'));
		//console.log(trk.index,trk.title);
		if (tlist.length) {
			getTrack(tlist.shift());
		} else {
			console.log('fini');
			require('child_process').execSync('zip -r playlist playlist');
		}
	});
}
const getPlaylist = async (plurl) => {
	emptyDir('playlist');
	let list = await ytpl(plurl, {limit:Infinity});
	//console.log(list);
	//list.items.forEach(trk => getTrack(trk));
	tlist = list.items;
	getTrack(tlist.shift());
}


readline.question('Enter YT playlist URL: ', yturl => {
	//console.log(yturl);
	readline.close();
	getPlaylist(yturl);
});
