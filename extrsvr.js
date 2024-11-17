const settings = require('./config');
const http = require('http');
const https = require('https');
const process = require('process');
const {parse} = require('querystring');
const fs = require('fs');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
//const mpd = require('mpd');
const MyMPD = require('./mpd.js');
const TuneIn = require('./services/tunein/tunein.js');
const Pandora = require('./services/pandora/pandora.js');

const formidable = require('formidable');	//, {errors as formidableErrors} from 'formidable';
const formidableErrors = formidable.errors;		//require('formidable:errors');

const hostname = process.env.NODE_WEB_HOST || '0.0.0.0';
const debugMode = false;
const enableUrlDecoding = true;
const documentRoot = '.';
const settingsFile = 'settings.json';
const playlistDir = 'playlist';

// polyfills
if (typeof btoa === 'undefined') global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
if (typeof atob === 'undefined') global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');

//var gresp = null;	// global response
var progv = 'Scanning playlist ...';

var tlist = [];
var pwtrk = '';
var errs = [];
var mympd = null;
var tunein = null;
var pandora = null;
var plogdin = false;		// may be later expendable

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
const getTrack = (trk, dest) => {
	//console.log(trk.index,trk.title);
	progv = trk.index + ' files processed';
	getAudioStream(trk.shortUrl, pwtrk, (aud) => {
		//console.log(aud);
		if (aud.error) {
			console.log(aud.error.message);
			errs.push(aud.error);
		} else {
			aud.stream.pipe(fs.createWriteStream(dest+'/'+trk.title+'.'+aud.fext));
		}
		if (tlist.length) {
			getTrack(tlist.shift(), dest);
		} else {
			if (settings.extr2Intrn) {
				progv = '.';
			} else {
				progv = 'Zipping Files ...';
				require('child_process').exec('zip -r playlist playlist',{},(error, stdout, stderr)=>{
					progv = '.';
				});
			}
		}
	});
}
const getPlaylist = async (parms, resp) => {
	const ytpl = require('ytpl');
	fs.unlink('playlist.zip', (err) => 1);
	emptyDir(playlistDir);
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
	tlist = list.items;
console.log(tlist.length+' tracks');
	pwtrk = parms.wtrk;
	let _dd = baseDir+'playlist_'+Date.now();
	fs.mkdirSync(_dd);
	getTrack(tlist.shift(), _dd);
}


const sendExtraction = (filePath) => {
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

const sendzip = (filePath, resp) => {
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


const fmtSearch = (cntnr, fmts) => {
	let ix = 0;
	do {
		if (fmts[ix].container == cntnr) return ix;
		++ix;
	} while (ix < fmts.length);
	return 0;
}

const getAudioStream = (yturl, which, cb) => {
	let rslt = {};
	let fext = 'mp4';
	ytdl.getInfo(yturl, {quality: 'highestaudio'})
	.then(info => {
		let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
		let tfmt = null;
		switch (which) {
			case '4':
				tfmt = audioFormats[fmtSearch('mp4', audioFormats)];
				fext = 'm4a';
				break;
			case 'w':
				tfmt = audioFormats[fmtSearch('webm', audioFormats)];
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

const audioExtract = (parms, resp) => {
	//console.log(parms);
	let yturl = parms.axtr;
	getAudioStream(parms.axtr, parms.wtrk, (aud) => {
		//console.log(aud);
		if (aud.error) {
			let msg = aud.error.message.replace(/\"/g,'');
			resp.end(`<script>parent.extrFini("sgl","${msg}")</script>`);
		} else if (settings.extr2Intrn) {
			let ws = fs.createWriteStream(baseDir+parms.tnam+'.'+aud.fext);
			ws.on('finish', () => {
				console.log('ws-end');
				resp.end(`<script>parent.extrFini("sgl","Audio extracted as '${parms.tnam}.${aud.fext}'")</script>`);
			});
			aud.stream.pipe(ws);
		//	resp.end(`<script>alert("Audio extracted as '${parms.tnam}.${aud.fext}'")</script>`);
		} else {
			resp.writeHead(200, {'Content-Type': aud.mimeType, 'Content-Length': aud.contentLength, 'Content-Disposition': `attachment; filename="${parms.tnam}.${aud.fext}"`});
			aud.stream.pipe(resp);
		}
	});
};

const getVideo = (yturl, which, vida, cb) => {
	let rslt = {};
	let fext = 'mp4';
	let filter = vida == 'a' ? 'videoandaudio' : 'video';
	ytdl.getInfo(yturl, {/*quality: 'highestvideo'*/})
	.then(info => {
		console.log(info.formats);
		let videoFormats = ytdl.filterFormats(info.formats, filter);	//console.log(videoFormats);
		let tfmt = null;
		switch (which) {
			case '4':
				tfmt = videoFormats[fmtSearch('mp4', videoFormats)];
				fext = 'mp4';
				break;
			case 'w':
				tfmt = videoFormats[fmtSearch('webm', videoFormats)];
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

const videoExtract = (parms, resp) => {
	//console.log(parms);
	let yturl = parms.vxtr;
	getVideo(parms.vxtr, parms.wtrk, parms.vida, (vid) => {
		//console.log(vid);
		if (vid.error) {
			let msg = vid.error.message.replace(/\"/g,'');
			resp.end(`<script>parent.extrFini("sgl","${msg}")</script>`);
		} else if (settings.extr2Intrn) {
			let ws = fs.createWriteStream(baseDir+parms.tnam+'.'+vid.fext);
			ws.on('finish', () => {
				console.log('ws-end');
				resp.end(`<script>parent.extrFini("vid","Video extracted as '${parms.tnam}.${vid.fext}'")</script>`);
			});
			vid.stream.pipe(ws);
		//	resp.end(`<script>alert("Video extracted as '${parms.tnam}.${vid.fext}'")</script>`);
		} else {
			resp.writeHead(200, {'Content-Type': vid.mimeType, 'Content-Length': vid.contentLength, 'Content-Disposition': `attachment; filename="${parms.tnam}.${vid.fext}"`});
			vid.stream.pipe(resp);
		}
	});
};

const getStreams = (parms, resp) => {
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
};

const getNavMenu = (dir, resp) => {
	let nav = '<div class="fmnav">';
	let _D = '';
	let parts = dir.split('/');
	if (parts[0]) {
		nav += '<span class="isdir" data-dpath=""><i class="fa fa-home" aria-hidden="true"></i></span> / ';
	} else {
		nav += '<span><i class="fa fa-home" aria-hidden="true"></i></span>';
	}
	do {
		let _d = parts.shift();
		let _dd = _d;
		if (parts.length) {
			_D += _d + (parts.length>1 ? '/' : '');
			nav += `<span class="isdir" data-dpath="${_D}">${_dd}</span> / `;
		} else {
			nav += `<span>${_d}</span>`;
		}
	} while (parts.length);
	resp.write(nav+'</div>');
};

const queMPD = (files) => {
	const writeStream = fs.createWriteStream('/var/lib/mpd/playlists/ytextrsvr.m3u');
	writeStream.on('finish', () => {
		mympd.sendCommands(['load ytextrsvr','play'], (err, status) => {console.log(err, status)});
	});

	let fcnt = files.length - 1;
	files.forEach((file, ix) => {
		const readStream = fs.createReadStream(playlistDir+'/'+file);
		if (ix < fcnt) {
			readStream.pipe(writeStream, { end: false });
		} else {
			readStream.pipe(writeStream);
		}
	});
};

const playlistList = (resp) => {
	resp.write('<section>');
	fs.readdir(playlistDir, (err, files) => {
		if (err) throw err;
		for (const file of files) {
			resp.write('<div><label><input type="checkbox" class="plsel" name="plsels[]" value="'+file+'">'+atob(file)+'</label></div>');
		}
		resp.end('</section>');
	});
};

const playlistMenu = (resp) => {
	resp.write('<select onchange="plselchg(this)"><option value="">- New Playlist -</option>');
	fs.readdir(playlistDir, (err, files) => {
		if (err) throw err;
		for (const file of files) {
			resp.write('<option value="'+file+'">'+atob(file)+'</option>');
		}
		resp.end('</select>');
	});
}

const baseDir = settings.baseDir;
const getDirList = (dir, resp) => {
	fs.readdir(baseDir+dir, {withFileTypes: true}, (err, files) => {
		if (err) throw err;
		let rows = [];
		let pdir = dir == '' ? dir : (dir+'/');
		for (const file of files) {
			let fcl, icn, lnk='';
			if (file.isDirectory()) {
				icn = '<i class="fa fa-folder fa-fw d-icn" aria-hidden="true"></i>';
				fcl = 'isdir" data-dpath="'+pdir+file.name;
			} else {
				icn = '<i class="fa fa-file-o fa-fw" aria-hidden="true"></i>';
				fcl = 'isfil" data-fpath="'+file.name;
			}
			if (file.isSymbolicLink()) {
				lnk = ' <i class="fa fa-arrow-right fa-fw" aria-hidden="true"></i>';
				let lnk2 = fs.readlinkSync(baseDir+dir+'/'+file.name);
			//	if (fs.statSync(lnk2).isDirectory()) {
			//		fcl = 'isdir" data-dpath="'+lnk2;
			//	}
				lnk += lnk2;
			}
			rows.push('<td><input type="checkbox" class="fsel" name="files[]" value="'+/*path.join(dir, */file.name/*)*/+'"></td>'
				+'<td class="'+fcl+'">'+icn+file.name+lnk+'</td>');
		}
		resp.write('<table><tr>'+rows.join('</tr><tr>')+'</tr></table>');
		resp.end();
	});
}

const sendFile = (parms, fname, resp) => {
	//console.log('[Info] Sending zip file');
	let filePath = atob(parms.sndf);
	let stats = fs.statSync(filePath);
	resp.setHeader('Content-Length', stats.size);
	if (parms.v) {
		resp.setHeader('Content-Type', 'audio/mp4');
	} else {
		resp.setHeader('Content-Type', 'application/octet-stream');
		resp.setHeader('Content-Disposition', 'attachment; filename="'+path.basename(filePath)+'"');
	}
	let stream = fs.createReadStream(filePath);
	stream.on('open', () => {
		stream.pipe(resp);
	});
	stream.on('error', () => {
		resp.setHeader('Content-Type','text/plain');
		resp.status(404).end('Not found');
	});
};

const receiveUpload = async (req, res) => {
	const form = new formidable.IncomingForm({uploadDir: settings.upldTmpDir, maxFileSize: 2147483648});	// formidable({});
	//let fields;
	//let files;
	form.parse(req, function(err, fields, files) {
		if (err) {
			console.error(err);
			res.writeHead(err.httpCode || 400, {'Content-Type': 'text/plain'});
			res.end(String(err));
		} else {
			fs.renameSync(files.upld.filepath, path.join(baseDir+fields.dir, files.upld.originalFilename));
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.end(JSON.stringify({ fields, files }, null, 2));
		}
	});
};

const webRadio = async (what, bobj, resp) => {
	if (!tunein) {
		if (!mympd) {
			mympd = await MyMPD.init();
		}
		tunein = new TuneIn(mympd);
	}
	tunein.action(what, bobj, resp);
/*	switch (what) {
	case 'home':
		let b = (bobj!=='undefined') ? atob(bobj) : '';
		tunein.browse(b, resp);
		break;
	case 'search':
		tunein.search(bobj, resp);
		break;
	case 'play':
		tunein.play(bobj, resp);
		break;
	case 'clear':
		mympd.clear();
		resp.end();
		break;
	}*/
};

const webPandora = async (what, bobj, resp) => {
	if (!settings.pandora_pass && what!='login') {
		resp.write(fs.readFileSync('services/pandora/login.html',{encoding:'utf8'}));
		resp.end();
	}
	if (!pandora && what!='login') {
		if (!mympd) {
			mympd = await MyMPD.init();
		}
		pandora = await Pandora.init(mympd, settings);
		console.log('p init done');
	}
	switch (what) {
	case 'home':
		let b = (bobj!=='undefined') ? atob(bobj) : '';
		pandora.browse(b, resp);
		break;
	case 'search':
		tunein.search(bobj, resp);
		break;
	case 'play':
		pandora.play(bobj, resp);
		break;
	case 'clear':
		mympd.clear();
		resp.end();
		break;
	case 'login':
		Pandora.authenticate(bobj)
		.then((rslt) => {
			if (rslt) {
				resp.end(rslt);
			} else {
				plogdin = true;				//@@@@@  save the login credentials  @@@@@@@
				settings.pandora_user = bobj.user;
				settings.pandora_pass = bobj.pass;
				fs.writeFileSync(settingsFile, JSON.stringify(settings,null,"\t"));
				resp.end();
			}
		});
	//	let rslt = await pandora.authenticate(bobj);
		break;
	default:
		resp.end('Unknown webPandora: '+what);
		break;
	}
};

const mpdCtrl = async (what, bobj, resp) => {
	if (!mympd) {
		mympd = await MyMPD.init();
	}
	switch (what) {
	case 'getVolume':
		mympd.getVolume()
		.then((v)=>resp.end(''+v));
		break;
	case 'setVolume':
		mympd.setVolume(bobj);
		resp.end();
		break;
	case 'bumpVolume':
		mympd.bumpVolume(bobj)
		.then((v)=>resp.end(''+v));
		break;
	case 'cmd':
		mympd.sendCommand(bobj);
		resp.end();
		break;
	case 'cmdb':
		mympd.sendCommandB(bobj)
		.then((d)=>resp.end(d));
		break;
	case 'search':
		tunein.search(bobj, resp);
		break;
	case 'play':
		tunein.play(bobj, resp);
		break;
	case 'clear':
		//mympd.clear();
		mympd.sendCommand('stop');
		resp.end();
		break;
	default:
		resp.end('Unknown mpdCtrl: '+what);
		break;
	}
};

const filemanAction = (parms, resp) => {
	console.log(parms);
	let rmsg = 'NOT YET IMPLEMENTED';
	resp.writeHead(200, {'Content-Type': 'text/plain'});
	let pbase, fpath, stats;
	switch (parms.act) {
	case 'fcomb':
		if (!fs.existsSync('/usr/bin/ffmpeg') && !fs.existsSync('/usr/local/bin/ffmpeg')) {
			rmsg = 'Required ffmpeg is not present';
			break;
		}
		pbase = baseDir+parms.dir+(parms.dir==''?'':'/');
		let eprms = '';
		for (const file of parms.files) {
			fpath = pbase+file;
			eprms += ` -i "${fpath}"`;
			stats = fs.statSync(fpath);
		}
		if (parms.files.length > 1) eprms += ' -codec copy';
		eprms += ` "${pbase+parms.asfile}"`;
		console.log(eprms);
		require('child_process').exec('ffmpeg -loglevel 16 -n'+eprms,{},(error, stdout, stderr)=>{
				console.log(error);
				rmsg = error ? String(error) : null;
			//	rmsg += stderr ? ('@@@@@@'+String(stderr)) : null;
				resp.end(rmsg);
			});
		return;
		rmsg = null;
		break;
	case 'plply':
		queMPD(parms.files);
	//	let plst = '';
	//	for (const file of parms.files) {
	//		plst += playlistDir+'/'+file + "\n";
	//		fs.unlinkSync(fpath);
	//	}
		rmsg = null;
		break;
	case 'pldel':
		for (const file of parms.files) {
			fpath = playlistDir+'/'+file;
			fs.unlinkSync(fpath);
		}
		rmsg = null;
		break;
	case 'plvue':
		rmsg = JSON.stringify({err:'', pl:fs.readFileSync(playlistDir+'/'+parms.file,{encoding:'utf8'})});
		break;
	case 'radio':
		webRadio(parms.what, parms.bobj??'', resp);
		return;
		break;
	case 'pandora':
		webPandora(parms.what, parms.bobj??'', resp);
		return;
		break;
	case 'mpd':
		mpdCtrl(parms.what, parms.bobj??'', resp);
		return;
		break;
	case 'fdele':
		pbase = baseDir+parms.dir+(parms.dir==''?'':'/');
		for (const file of parms.files) {
			fpath = pbase+file;
			stats = fs.statSync(fpath);
			if (stats.isDirectory()) {
				fs.rmSync(fpath, {recursive: true, force: true});
			} else {
				fs.unlinkSync(fpath);
			}
		}
		rmsg = null;
		break;
	case 'fdnld':
		if (parms.files.length>1) {
			rmsg = JSON.stringify({err: 'Multiple file download not yet implemented'});
			break;
		}
		fpath = baseDir+parms.dir+parms.files[0];
		stats = fs.statSync(fpath);
		if (stats.isDirectory()) {
			rmsg = JSON.stringify({err: 'Multiple file (i.e. folder) download not yet implemented'});
			break;
		}
		rmsg = JSON.stringify({err: '', fnam: parms.files[0], f64: btoa(fpath)});
		break;
	case 'fmove':
		let fdir = baseDir+parms.fdir;
		let tdir = baseDir+parms.tdir;
		for (const file of parms.files) {
			fs.renameSync(fdir+file, tdir+file);
		}
		rmsg = null;
		break;
	case 'fnewf':
		let pdir = baseDir+parms.dir;
		fs.mkdirSync(path.join(pdir, parms.newf));
		rmsg = null;
		break;
	case 'frnam':
		pbase = baseDir+parms.dir+(parms.dir==''?'':'/');
		fs.renameSync(pbase+parms.file, pbase+parms.to);
		rmsg = null;
		break;
	case 'funzp':
		pbase  = baseDir+parms.dir+(parms.dir==''?'':'/');
		require('child_process').exec('unzip -d "'+pbase+'" "'+pbase+parms.file+'"',{},(error, stdout, stderr)=>{
				console.log(error);
				rmsg = error ? String(error) : null;
				resp.end(rmsg);
			});
		return;
		break;
	case 'faddl':
		pbase = baseDir+parms.dir;
		console.log(pbase,parms.files);
		let plst = '';
		for (const file of parms.files) {
			plst += pbase+file + "\n";
		}
		try {
			fs.writeFileSync(playlistDir+'/'+btoa(parms.plnam), plst);
			// file written successfully
			rmsg = null;
		} catch (err) {
			console.error(err);
			rmsg = 'Failed to write playlist';
		}
		break;
	case 'fview':
		fpath = baseDir+parms.fpath;
// @@@@@@@@@@
// could get file type here and send to client for display adjustments
//		stats = fs.statSync(fpath);
//		console.log(stats);
		rmsg = JSON.stringify({err: '', f64: btoa(fpath)});
		break;
	case 'splay':
		fpath = baseDir+parms.fpath;
		rmsg = JSON.stringify({err: 'NOT YET IMPLEMENTED', f64: btoa(fpath)});
		break;
	}
	resp.end(rmsg);
}

const runScript = (file, url, pdata, response) => {
	//console.log('SCRIPT: '+url);
	file = file.replace(/^\.\//,'');
	let param = url.substr(url.indexOf('?')+1);
	if (pdata) {
		param = param + '" "' + pdata;
	}
	//console.log(file,param);
	require('child_process').exec('php ' + file + ' "' + param +'" ',{},(error, stdout, stderr)=>{
		if (error) {
			response.writeHead(500, {'Content-Type': 'text/plain;charset=utf-8'});
			response.write(stderr + "\n");
			response.end();
		} else {
			response.writeHead(200,{'Content-Type': 'text/html;charset=utf-8'});
			response.write(stdout);
			response.end();
		}
	});
};

// serve a file
const serveFile = (filePath, response, url, pdata) => {
	//console.log('SERVE FILE: '+filePath);
	let extname = String(path.extname(filePath)).toLowerCase();
	const MIME_TYPES = {
		'.html': 'text/html',
		'.css': 'text/css',
		'.js': 'text/javascript',
		'.jpeg': 'image/jpeg',
		'.jpg': 'image/jpeg',
		'.png': 'image/png',
		'.json': 'application/json',
		'.mp4': 'audio/mp4',
		'.zip': 'application/zip',
		'.webm': 'video/mp4'
	};

	// prevent path taversal attempt
	if (path.normalize(decodeURI(url)) !== decodeURIComponent(url)) {
		response.statusCode = 403;
		response.end();
		return;
	}

	let contentType = MIME_TYPES[extname] || 'application/octet-stream';

	if (contentType.indexOf('/zip')>0) {
		progv = 'Scanning playlist ...';
		sendzip(filePath, response);
		return;
	}

	if (contentType.indexOf('mp4')>0) {
		sendExtraction('video.mp4');
		return;
	}

	if (extname == '.php') {
		runScript(filePath, url, pdata, response);
		return;
	}

	// Serve static files
	fs.readFile(filePath, function(error, content) {
		if (error) {
			if(error.code === 'ENOENT') {
				fs.readFile(documentRoot + '/404.html', function(error, content) {
					if (error) { console.error(error); }
					else {
						response.writeHead(404, { 'Content-Type': 'text/html' });
						response.end(content, 'utf-8');
						// log served 404 page
						console.log('[Info] Served 404 page.');
					}
				});
			}
			else if (error.code === 'EISDIR' && fs.existsSync(filePath+'/index.html')) {
				fs.readFile(filePath+'/index.html', function(error, content) {
					if (error) { console.error(error); }
					else {
						response.setHeader('Cache-Control', ['no-cache','max-age=0']);
						response.writeHead(200, { 'Content-Type':'text/html' });
						response.end(content, 'utf-8');
						// log served page
						console.log('[Info] Served:', url);
					}
				});
			}
			else {
				response.writeHead(500);
				response.end('Sorry, check with the site admin for error: '+error.code+' ...\n');
				// display error
				console.log('[Error] Could not serve request:', url);
				console.error(error);
			}
		}
		else {
			if (contentType=='text/html') {
				response.setHeader('Cache-Control', ['no-cache','max-age=0']);
			}
			response.writeHead(200, {'Content-Type':contentType});
			response.end(content, 'utf-8');
			// log served response
			//console.log('[Info] Served:', url);
		}
	});
};

// merge settings
try {
	Object.assign(settings, JSON.parse(fs.readFileSync(settingsFile,{encoding:'utf8'})));
	console.log(settings);
} catch (err) {
	console.error('no settings file merged');
}

// Web server
http.createServer(function (request, response) {
	const {method, url} = request;

	if (url.startsWith('/?upld')) {
		receiveUpload(request, response);
		return;
	}

	let pdata = null;

	//console.log('[Info] Requested:', url);
	if (debugMode === true && enableUrlDecoding === true) {
		console.log('[Debug] Decoded:', decodeURI(url));
	}

	if (method=='POST') {
		let body = '';
		request.on('error', (err) => {
			console.error(err);
		}).on('data', (chunk) => {
			body += chunk.toString();
		}).on('end', () => {
			response.on('error', (err) => {
				console.error(err);
			});
			if (url.startsWith('/?_FM')) {
				let rdata = request.headers['content-type'] == 'application/json' ? JSON.parse(body) : parse(body);
				filemanAction(rdata, response);
				return;
			}
			if (url.startsWith('/?upld')) {
				receiveUpload(request, response);
				return;
			}
			//performAction(JSON.parse(body));
			//performAction(body);
		//	console.log(body);
		//	pdata = body;
		//	console.log(pdata);
			
//		});



	let filePath = parse(url.substring(1));

	// Correct root path
	if (filePath === '/') {
		filePath = documentRoot + '/index.html';
	} else {
		filePath = documentRoot + (enableUrlDecoding === true ? decodeURI(url) : url);
	}

	// serve the file
	serveFile(filePath.split('?').shift(), response, url, pdata);



		});
		return;
	}

	if (url.startsWith('/?plstl')) {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		playlistList(response);
		//response.end(playlistMenu());
		return;
	}
	if (url.startsWith('/?axtr')) {
		audioExtract(parse(url.substring(2)), response);
		return;
	}
	if (url.startsWith('/?vxtr')) {
		videoExtract(parse(url.substring(2)), response);
		return;
	}
	if (url.startsWith('/?sndf')) {
		sendFile(parse(url.substring(2)), 'testing.txt', response);
		return;
	}
	if (url.startsWith('/?pxtr')) {
		progv = 'Scanning playlist ...';
		getPlaylist(parse(url.substring(2)), response);
		response.writeHead(200, {'Content-Type': 'text/html'});
	//	response.end();
		return;
	}
	if (url.startsWith('/?prog')) {
		console.log('P '+progv);
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end(progv);
		return;
	}
	if (url.startsWith('/?strms')) {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		getStreams(parse(url.substring(2)), response);
	//	response.end(JSON.stringify(strms));
		return;
	}
	if (url.startsWith('/?dirl')) {
		//console.log(progv);
		response.writeHead(200, {'Content-Type': 'text/plain'});
		let dpath = parse(url.substring(2)).dirl;
		getNavMenu(dpath, response);
		getDirList(dpath, response);
		//response.end();
		return;
	}
	if (url.startsWith('/?plmn')) {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		playlistMenu(response);
		//response.end(playlistMenu());
		return;
	}

	let filePath = parse(url.substring(1));

	// Correct root path
	if (filePath === '/') {
		filePath = documentRoot + '/index.html';
	} else {
		filePath = documentRoot + (enableUrlDecoding === true ? decodeURI(url) : url);
	}

	// serve the file
	serveFile(filePath.split('?').shift(), response, url, pdata);

}).listen(settings.port, hostname, () => {
	console.log(`YT Audio Extraction Server (http://${hostname}:${settings.port}) started`);
});

