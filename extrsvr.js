const http = require('http')
const https = require('https');
const process = require('process');
const {parse} = require('querystring');
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');

const hostname = process.env.NODE_WEB_HOST || '0.0.0.0';
const svrport = 6680;
const debugMode = false;
const enableUrlDecoding = true;
const documentRoot = '.';

//var gresp = null;	// global response
var progv = 'Scanning playlist ...';

var tlist = [];
var pwtrk = '';
var errs = [];

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
	//console.log(trk.index,trk.title);
	progv = trk.index + ' files processed';
	getAudioStream(trk.shortUrl, pwtrk, (aud) => {
		//console.log(aud);
		if (aud.error) {
			errs.push(aud.error);
		} else {
			aud.stream.pipe(fs.createWriteStream('playlist/'+trk.title+'.'+aud.fext));
		}
		if (tlist.length) {
			getTrack(tlist.shift());
		} else {
			//console.log('fini');
			progv = 'Zipping Files ...';
			require('child_process').exec('zip -r playlist playlist',{},(error, stdout, stderr)=>{
				//console.log('zipped');
				progv = '.';
			});
		}
	});
}
const getPlaylist = async (parms, resp) => {
	const ytpl = require('ytpl');
	fs.unlink('playlist.zip', (err) => 1);
	emptyDir('playlist');
	let plurl = parms.pxtr;
	let list = await ytpl(plurl, {limit:Infinity});
	tlist = list.items;
	pwtrk = parms.wtrk;
	getTrack(tlist.shift());
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
				tfmt = audioFormats[0];
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
			resp.end(`<script>alert("${aud.error}")</script>`);
		} else {
			resp.writeHead(200, {'Content-Type': aud.mimeType, 'Content-Length': aud.contentLength, 'Content-Disposition': `attachment; filename="${parms.tnam}.${aud.fext}"`});
			aud.stream.pipe(resp);
		}
	});
};


// serve a file
const serveFile = (filePath, response, url) => {
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
			response.writeHead(200, { 'Content-Type':contentType });
			response.end(content, 'utf-8');
			// log served response
			//console.log('[Info] Served:', url);
		}
	});
};


// Web server
http.createServer(function (request, response) {
	const {method, url} = request;

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
			performAction(JSON.parse(body));
			//performAction(body);
		});
		return;
	}

	if (url.startsWith('/?axtr')) {
		audioExtract(parse(url.substring(2)), response);
		return;
	}
	if (url.startsWith('/?pxtr')) {
		progv = 'Scanning playlist ...';
		getPlaylist(parse(url.substring(2)), response);
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end();
		return;
	}
	if (url.startsWith('/?prog')) {
		//console.log(progv);
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end(progv);
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
	serveFile(filePath.split('?').shift(), response, url);

}).listen(svrport, hostname, () => {
	console.log(`YT Audio Extraction Server (http://${hostname}:${svrport}) started`);
});

