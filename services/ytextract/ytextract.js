'use strict';
import cntrlr from '../../lib/controller.js';
//import ytdl from '@distube/ytdl-core';
import {createReadStream,createWriteStream,mkdirSync,readdir,statSync,unlink} from 'fs';
import WebSocket, {WebSocketServer} from 'ws';

export default class YTExtract {

	constructor () {
		this.tlist = [];
		this.pwtrk = '';
		this.progv = 'Scanning playlist ...';
		this.infoCache = null;
		this.fmts = {};
	//	this.agent = null;
	//	const cf = cntrlr.readFile('services/ytextract/nocookies.json', null);
	//	if (cf) {
	//		const agentOptions = {pipelining:5,maxRedirections:0,localAddress:'127.0.0.1'};
	//		this.agent = ytdl.createAgent(JSON.parse(cf), agentOptions);
	//		//console.log('agent',this.agent);
	//	}
		this.ws = new WebSocketServer({port:6688});
		this.ws.on('connection', (sc) => {
			sc.on('error', console.error);
			sc.on('message', (data) => {
				console.log(data);
				console.log('received: %s', data);
				sc.send('PROCESSING...');
				this.pyExtract(data.toString(), sc);
			});
		});
	}

	async pyExtract (parms, sc) {
		const frm = JSON.parse(parms);
		const dest = frm.tname ? (cntrlr.config.baseDir+frm.tname+'.%(ext)s') : (cntrlr.config.baseDir+'%(title)s-%(id)s.%(ext)s');
		const format = ' -f '+frm.format;
		const url = ' "'+frm.yturl+'"';
		const x = await import('child_process');

		const spawn = x.spawn('python', ['-u','services/ytextract/youtube-dl','-o',dest,'-f',frm.format,frm.yturl]);
		spawn.stdout.on('data', (data) => {
			//console.log(data.toString());
			sc.send('<br>'+data.toString());
		});

		spawn.stderr.on('data', (data) => {
			//console.error(data.toString());
			sc.send('<br>'+data.toString());
		});

		spawn.on('close', (code) => {
			console.log(`child process exited with code ${code}`);
			sc.send('<br>=- DONE -=');
		}); 
/*
		x.exec('python -u services/ytextract/youtube-dl -o '+dest+format+url,{},(error, stdout, stderr)=>{
			if (error) {
				console.error(stderr);
				sc.send(stdout);
			} else {
				sc.send(stdout);
			}
			if (stderr) {
				sc.send(stderr);
			}
		});
*/
	}

	action (what, parms, resp) {
		switch (what) {
		case 'axtr':
			this.audioExtract(parms, resp);
			break;
		case 'vxtr':
			this.videoExtract(parms, resp);
			break;
		case 'pxtr':
			this.progv = 'Scanning playlist ...';
			this.getPlaylist(parms, resp);
			break;
		case 'strms':
			this.getStreams(parms, resp);
			break;
		case 'prog':
			resp.end(this.progv);
			break;
		case 'load':
			resp.end(cntrlr.readFile('services/ytextract/ytextract.html', 'FAILED TO READ'));
			break;
		default:
			resp.end('Unknown webYTx: '+what);
			break;
		}
	}

	getTrack (trk, dest) {
		//console.log(trk.index,trk.title);
		this.progv = trk.index + ' files processed';
		this.getAudioStream(trk.shortUrl, this.pwtrk, (aud) => {
			//console.log(aud);
			if (aud.error) {
				console.error(aud.error.message);
				errs.push(aud.error);
			} else {
				aud.stream.pipe(createWriteStream(dest+'/'+trk.title+'.'+aud.fext));
			}
			if (this.tlist.length) {
				this.getTrack(this.tlist.shift(), dest);
			} else {
				if (cntrlr.config.extr2Intrn) {
					this.progv = '.';
				} else {
					this.progv = 'Zipping Files ...';
					require('child_process').exec('zip -r playlist playlist',{},(error, stdout, stderr)=>{
						this.progv = '.';
					});
				}
			}
		});
	}

	async getPlaylist (parms, resp) {
		const ytpl = await import('@distube/ytpl');
		unlink('playlist.zip', (err) => 1);
	//	this._emptyDir(playlistDir);
		let plurl = parms.pxtr;
		let list;
		try {
			list = await ytpl.default(plurl, {limit:Infinity});
			resp.end();
		} catch (err) {
			let msg = err.message.replace(/"/g,'');
			resp.end(`<script>alert("${msg}")</script>`);
			return;
		}
		this.tlist = list.items;
	//console.log(this.tlist.length+' tracks');
		this.pwtrk = parms.wtrk;
		let _dd = cntrlr.config.baseDir+'playlist_'+Date.now();
		mkdirSync(_dd);
		this.getTrack(this.tlist.shift(), _dd);
	}

	sendzip (filePath, resp) {
		//console.log('[Info] Sending zip file');
		let stats = statSync(filePath);
		resp.setHeader('Content-Type', 'application/zip');
		resp.setHeader('Content-Length', stats.size);
		resp.setHeader('Content-Disposition', 'attachment; filename="playlist.zip"');
		let stream = createReadStream(filePath);
		stream.on('open', () => {
			stream.pipe(resp);
		});
		stream.on("error", () => {
			resp.set("Content-Type","text/plain");
			resp.status(404).end("Not found");
		});
	};

	getAudioStream (yturl, which, cb) {
		let rslt = {};
		let fext = 'mp4';

		if (which.startsWith('s')) {
			let itag = which.split('.')[1];
			let tfmt = this.fmts[itag];
			rslt.fext = tfmt.container;
			rslt.mimeType = tfmt.mimeType;
			rslt.contentLength = tfmt.contentLength;
			rslt.stream = ytdl.downloadFromInfo(this.infoCache,{format: tfmt});
			cb(rslt);
			return;
		}

		ytdl.getInfo(yturl)
		.then(info => {				//console.log(info);
			let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');				//console.log(audioFormats);
			let tfmt = null;
			switch (which) {
				case '4':
					tfmt = audioFormats[this.fmtSearch('mp4', audioFormats)];
					fext = 'm4a';
					break;
				case 'w':
					tfmt = audioFormats[this.fmtSearch('webm', audioFormats)];
					fext = 'webm';
					break;
				default:
					tfmt = ytdl.chooseFormat(info.formats, {quality: 'highestaudio'});
					fext = tfmt.container;
			}
			rslt.fext = fext;
			rslt.mimeType = tfmt.mimeType;
			rslt.contentLength = tfmt.contentLength;
			rslt.stream = ytdl.downloadFromInfo(info,{format: tfmt});
			cb(rslt);
		})
		.catch((error) => {
			cb({error});
		});
	}

	audioExtract (parms, resp) {
		console.log(parms);
		this.getAudioStream(parms.yturl, parms.wtrk, (aud) => {
			this._stream2storage(aud, parms.tname+'.'+aud.fext)
			.then(m => resp.end(m), m => resp.end('!!'+m));
			//.catch(m => resp.end('!!'+m));
		});
	}

	getVideo (yturl, which, vida, cb) {
		let rslt = {};
		let fext = 'mp4';

		if (which.startsWith('s')) {
			let itag = which.split('.')[1];
			let tfmt = this.fmts[itag];
			rslt.fext = tfmt.container;
			rslt.mimeType = tfmt.mimeType;
			rslt.contentLength = tfmt.contentLength;
			rslt.stream = ytdl.downloadFromInfo(this.infoCache,{format: tfmt});
			cb(rslt);
			return;
		}

		let filter = vida == 'a' ? 'videoandaudio' : 'video';
		ytdl.getInfo(yturl)
		.then(info => {
			let videoFormats = ytdl.filterFormats(info.formats, filter);	//console.log(videoFormats);
			if (!videoFormats.length) throw new Error('No requested format could be located.');
			let tfmt = null;
			switch (which) {
				case '4':
					tfmt = videoFormats[this.fmtSearch('mp4', videoFormats)];
					fext = 'mp4';
					break;
				case 'w':
					tfmt = videoFormats[this.fmtSearch('webm', videoFormats)];
					fext = 'webm';
					break;
				default:
					tfmt = ytdl.chooseFormat(info.formats, {quality: 'highestvideo'});
					fext = tfmt.container;
			}
			rslt.fext = fext;
			rslt.mimeType = tfmt.mimeType;
			rslt.contentLength = tfmt.contentLength;
			rslt.stream = ytdl.downloadFromInfo(info,{format: tfmt});
			cb(rslt);
		})
		.catch((error) => {
			cb({error});
		});
	}

	videoExtract (parms, resp) {
		//console.log(parms);
		let yturl = parms.vxtr;
		this.getVideo(parms.yturl, parms.wtrk, parms.vida, (vid) => {
			this._stream2storage(vid, parms.tname+'.'+vid.fext)
			.then(m => resp.end(m), m => resp.end('!!'+m));
		});
	}

	getStreams (parms, resp) {
		//console.log(parms);
		let yturl = parms.strms;
		let whch = parms.whch;
		ytdl.cache.info.clear();
		ytdl.getInfo(yturl, {playerClients: ['IOS','WEB_CREATOR','WEB'], agent: this.agent})
	//	ytdl.getInfo(yturl,{playerClients: [/*"WEB_EMBEDDED", "IOS", "ANDROID",*/ 'TV']})
		.then(info => {
			this.infoCache = info;
			this.fmts = {};
			let fmts = ytdl.filterFormats(info.formats, whch);			//console.log(fmts);
			fmts.forEach(f => this.fmts[f.itag] = f);
			let strms = [];
			if (whch=='audio') {
				fmts.forEach(f => strms.push({itag: f.itag, mime: f.mimeType, audbr: f.audioBitrate, audsr: f.audioSampleRate}));
			} else {
				fmts.forEach(f => strms.push({itag: f.itag, mime: f.mimeType, size: f.width+'x'+f.height, reso: f.quality, audio: f.hasAudio}));
			}
			resp.end(JSON.stringify(strms));
		});
	//	return strms;
	}

	fmtSearch (cntnr, fmts) {
		let ix = 0;
		do {
			if (fmts[ix].container == cntnr) return ix;
			++ix;
		} while (ix < fmts.length);
		return 0;
	}

	_stream2storage (strm, fnam) {
		return new Promise((resolve, reject) => {
			if (strm.error) {
				let msg = strm.error.message.replace(/"/g,'');
				reject(msg);
			}
			const fd = fnam.split('/');
			if (fd.length>1) {
			}
			let ws = createWriteStream(cntrlr.config.baseDir+fnam);
			ws.on('error', (err) => {
				console.error(err);
				reject(`Failed to write file: ${err.message}`);
			});
			ws.on('finish', () => {
				resolve(`Stream extracted as '${fnam}`);
			});
			strm.stream.on('error', (err) => {
				console.error('WTF',err);
				reject(`Failed to extract stream: ${err.message}`);
			});
			strm.stream.pipe(ws);
		});
	}

	_emptyDir (dir) {
		readdir(dir, (err, files) => {
			if (err) throw err;
			for (const file of files) {
				unlink(path.join(dir, file), (err) => {
					if (err) throw err;
				});
			}
		});
	}

}
