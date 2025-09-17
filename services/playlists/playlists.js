'use strict';
import cntrlr from '../../lib/controller.js';
import {createReadStream,createWriteStream,readdir,unlinkSync} from 'fs';

export default class Playlists {

	constructor (mympd) {
		this.mpdc = mympd;
		this.playlistDir = cntrlr.config.playlistDir;
		this.lists = [];
	}

	action (what, params, resp) {
		switch (what) {
		case 'home':
			resp.write('<section>');
			readdir(this.playlistDir, (err, files) => {
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
				unlinkSync(fpath);
			}
			resp.end();
			break;
		case 'plget':
			const _plst = cntrlr.readFile(this.playlistDir+params.file, 'FAILURE READING FILE');
			resp.end(JSON.stringify({err:'', pl: _plst}));
			break;
		case 'plvue':
			let plst = cntrlr.readFile(this.playlistDir+params.file, 'FAILURE READING FILE').split('\n');
			const bd = cntrlr.config.baseDir;
			const _l = bd.length;
			plst.forEach((itm, ix) => {
				if (itm.startsWith(bd)) {
					plst[ix] = itm.slice(_l);
				}
			});
			resp.end(JSON.stringify({err:'', pl: plst.join('\n')}));
			break;
		case 'plply':
			this.mpdc.realm = params.realm;
			this.#queMPD(params.files);
			resp.end();
			break;
		case 'play':
			resp.end(JSON.stringify(this.lists[params.files]));
			break;
		//case 'lplay':
		//	this.lplay(params, resp);
		//	break;
		case 'clear':
			this.mpdc.clear();
			resp.end();
			break;
		case 'plmn':
			this.#playlistMenu(resp);
			break;
		case 'load':
			resp.end(cntrlr.readFile('services/playlists/playlists.html', 'FAILED TO READ'));
			break;
		default:
			resp.end('Unknown webList: '+what);
			break;
		}
	}

	#playlistMenu (resp) {
		resp.write('<select onchange="Playlists.plselchg(this)"><option value="">- New Playlist -</option>');
		readdir(this.playlistDir, (err, files) => {
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
		const writeStream = createWriteStream('/var/lib/mpd/playlists/ytextrsvr.m3u');
		writeStream.on('finish', () => {
			this.mpdc.sendCommands(['load ytextrsvr','play'], (err, status) => {console.log(err, status)});
		});

		let fcnt = files.length - 1;
		files.forEach((file, ix) => {
			const readStream = createReadStream(this.playlistDir+file);
			if (ix < fcnt) {
				readStream.pipe(writeStream, { end: false });
			} else {
				readStream.pipe(writeStream);
			}
		});
	}


}
