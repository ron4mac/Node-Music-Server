'use strict';
const cntrlr = require('../../controller');
//const http = require('http');
//const https = require('https');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');

module.exports = class YTExtract {

	constructor () {
		this.tlist = [];
		this.pwtrk = '';
		this.progv = 'Scanning playlist ...';
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
				console.log(aud.error.message);
				errs.push(aud.error);
			} else {
				aud.stream.pipe(fs.createWriteStream(dest+'/'+trk.title+'.'+aud.fext));
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
		const ytpl = require('ytpl');
		fs.unlink('playlist.zip', (err) => 1);
	//	this._emptyDir(playlistDir);
		let plurl = parms.pxtr;
		let list;
		try {
			list = await ytpl(plurl, {limit:Infinity});
			resp.end();
		} catch (err) {
			let msg = err.message.replace(/\"/g,'');
			resp.end(`<script>alert("${msg}")</script>`);
			return;
		}
		this.tlist = list.items;
	console.log(this.tlist.length+' tracks');
		this.pwtrk = parms.wtrk;
		let _dd = cntrlr.config.baseDir+'playlist_'+Date.now();
		fs.mkdirSync(_dd);
		this.getTrack(this.tlist.shift(), _dd);
	}

	sendExtraction (filePath) {
		//console.log('[Info] Sending audio track');
		let stats = fs.statSync(filePath);
		gresp.setHeader('Content-Type', 'application/octet-stream');
		gresp.setHeader('Content-Length', stats.size);
		gresp.setHeader('Content-Disposition', 'attachment; filename="audio.m4a"');
		let stream = fs.createReadStream(filePath);
		stream.on("open", () => {
			//gresp.set("Content-Type","video/mp4");
			//gresp.writeHead(200, {'Content-Type':'video/mp4','Content-Length':stats.size});
			stream.pipe(gresp);
		});
		stream.on("error", () => {
			gresp.set("Content-Type","text/plain");
			gresp.status(404).end("Not found");
		});
	};

	sendzip (filePath, resp) {
		//console.log('[Info] Sending zip file');
		let stats = fs.statSync(filePath);
		resp.setHeader('Content-Type', 'application/zip');
		resp.setHeader('Content-Length', stats.size);
		resp.setHeader('Content-Disposition', 'attachment; filename="playlist.zip"');
		let stream = fs.createReadStream(filePath);
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
		ytdl.getInfo(yturl, {quality: 'highestaudio'})
		.then(info => {
			let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
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
					if (which.startsWith('s')) {
						let itag = which.split('.')[1];
						tfmt = ytdl.chooseFormat(info.formats, {quality: itag});
					} else {
						tfmt = audioFormats[0];
					}
					fext = tfmt.container;
			}
			rslt.fext = fext;
			rslt.mimeType = tfmt.mimeType;
			rslt.contentLength = tfmt.contentLength;
			rslt.stream = ytdl(yturl,{format: tfmt});
			cb(rslt);
		})
		.catch((error) => {
			cb({error});
		});
	}

	audioExtract (parms, resp) {
		//console.log(parms);
		let yturl = parms.axtr;
		this.getAudioStream(parms.axtr, parms.wtrk, (aud) => {
			//console.log(aud);
			if (aud.error) {
				let msg = aud.error.message.replace(/\"/g,'');
				resp.end(`<script>parent.YTx.extrFini("sgl","${msg}")</script>`);
			} else if (cntrlr.config.extr2Intrn) {
				let ws = fs.createWriteStream(cntrlr.config.baseDir+parms.tnam+'.'+aud.fext);
				ws.on('finish', () => {
					console.log('ws-end');
					resp.end(`<script>parent.YTx.extrFini("sgl","Audio extracted as '${parms.tnam}.${aud.fext}'")</script>`);
				});
				aud.stream.pipe(ws);
			//	resp.end(`<script>alert("Audio extracted as '${parms.tnam}.${aud.fext}'")</script>`);
			} else {
				resp.writeHead(200, {'Content-Type': aud.mimeType, 'Content-Length': aud.contentLength, 'Content-Disposition': `attachment; filename="${parms.tnam}.${aud.fext}"`});
				aud.stream.pipe(resp);
			}
		});
	}

	getVideo (yturl, which, vida, cb) {
		let rslt = {};
		let fext = 'mp4';
		let filter = vida == 'a' ? 'videoandaudio' : 'video';
		ytdl.getInfo(yturl, {/*quality: 'highestvideo'*/})
		.then(info => {
			//console.log(info.formats);
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
					if (which.startsWith('s')) {
						let itag = which.split('.')[1];
						tfmt = ytdl.chooseFormat(info.formats, {quality: itag});
					} else {
						tfmt = videoFormats[0];
					}
					fext = tfmt.container;
			}
			rslt.fext = fext;
			rslt.mimeType = tfmt.mimeType;
			rslt.contentLength = tfmt.contentLength;
			rslt.stream = ytdl(yturl,{format: tfmt});
			cb(rslt);
		})
		.catch((error) => {
			cb({error});
		});
	}

	videoExtract (parms, resp) {
		console.log(parms);
		let yturl = parms.vxtr;
		this.getVideo(parms.vxtr, parms.wtrk, parms.vida, (vid) => {
			//console.log(vid);
			if (vid.error) {
				let msg = vid.error.message.replace(/\"/g,'');
				resp.end(`<script>parent.YTx.extrFini("vid","${msg}")</script>`);
			} else if (cntrlr.config.extr2Intrn) {
				let ws = fs.createWriteStream(cntrlr.config.baseDir+parms.tnam+'.'+vid.fext);
				ws.on('finish', () => {
					console.log('ws-end');
					resp.end(`<script>parent.YTx.extrFini("vid","Video extracted as '${parms.tnam}.${vid.fext}'")</script>`);
				});
				vid.stream.pipe(ws);
			//	resp.end(`<script>alert("Video extracted as '${parms.tnam}.${vid.fext}'")</script>`);
			} else {
				resp.writeHead(200, {'Content-Type': vid.mimeType, 'Content-Length': vid.contentLength, 'Content-Disposition': `attachment; filename="${parms.tnam}.${vid.fext}"`});
				vid.stream.pipe(resp);
			}
		});
	}

	getStreams (parms, resp) {
		console.log(parms);
		let yturl = parms.strms;
		let whch = parms.whch;
		ytdl.getInfo(yturl)
		.then(info => {
			let fmts = ytdl.filterFormats(info.formats, whch);
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

	_emptyDir (dir) {
		fs.readdir(dir, (err, files) => {
			if (err) throw err;
			for (const file of files) {
				fs.unlink(path.join(dir, file), (err) => {
					if (err) throw err;
				});
			}
		});
	}


}