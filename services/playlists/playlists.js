'use strict';
const cntrlr = require('../../controller');
const fs = require('fs');

module.exports = class Playlists {

	constructor (mympd) {
		this.mpdc = mympd;
		this.playlistDir = cntrlr.config.playlistDir;
		this.lists = [];
	}

	action (what, params, resp) {
		switch (what) {
		case 'home':
			resp.write('<section>');
			fs.readdir(this.playlistDir, (err, files) => {
				if (err) {
					if (err.code=='ENOENT') {
						console.info('playlist directory not found');
						files = [];
					} else {
						throw err;
					}
				}
				//console.log('plf', files)
				if (files.length) {
					for (const file of files) {
						resp.write('<div data-plfn="'+file+'"><label><input type="checkbox" class="plsel" name="plsels[]" value="'+file+'">'+atob(file)+'</label>');
						resp.write(' <i class="fa fa-headphones lplay" onclick="Playlists.lplay(event)"></i></div>');
					}
				} else {
					resp.write('THERE ARE NO PLAYLISTS');
				}
				resp.end('</section>');
			});
			break;
		case 'add':
			this.add(params, resp);
			break;
		case 'pldel':
			for (const file of params.files) {
				const fpath = this.playlistDir+file;
				fs.unlinkSync(fpath);
			}
			resp.end();
			break;
		case 'plvue':
			resp.end(JSON.stringify({err:'', pl: cntrlr.readFile(this.playlistDir+params.file, 'FAILURE READING FILE')}));
			break;
		case 'plply':
			this.#queMPD(params.files);
			resp.end();
			break;
		case 'play':
			resp.end(JSON.stringify(this.lists[params]));
			break;
		case 'lplay':
			this.lplay(params, resp);
			break;
		case 'clear':
			this.mpdc.clear();
			resp.end();
			break;
		case 'load':
			resp.end(cntrlr.readFile('services/playlists/playlists.html', 'FAILED TO READ'));
			break;
		default:
			resp.end('Unknown webList: '+what);
			break;
		}
	}

	playlistMenu (resp) {
		resp.write('<select onchange="plselchg(this)"><option value="">- New Playlist -</option>');
		fs.readdir(this.playlistDir, (err, files) => {
			if (err) {
				if (err.code=='ENOENT') {
					console.info('playlist directory not found');
					files = [];
				} else {
					throw err;
				}
			}
			for (const file of files) {
				resp.write('<option value="'+file+'">'+atob(file)+'</option>');
			}
			resp.end('</select>');
		});
	}

	#queMPD (files) {
		const writeStream = fs.createWriteStream('/var/lib/mpd/playlists/ytextrsvr.m3u');
		writeStream.on('finish', () => {
			this.mpdc.sendCommands(['load ytextrsvr','play'], (err, status) => {console.log(err, status)});
		});

		let fcnt = files.length - 1;
		files.forEach((file, ix) => {
			const readStream = fs.createReadStream(this.playlistDir+file);
			if (ix < fcnt) {
				readStream.pipe(writeStream, { end: false });
			} else {
				readStream.pipe(writeStream);
			}
		});
	}


}
