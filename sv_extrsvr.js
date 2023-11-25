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

var gresp = null;	// global response

const sendExtraction = (filePath) => {
	console.log('[Info] Sending audio track');
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

// serve a file
const serveFile = (filePath, response, url) => {
	console.log('SERVE FILE: '+filePath);
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
		'.webm': 'video/mp4'
	};

	let contentType = MIME_TYPES[extname] || 'application/octet-stream';

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
			console.log('[Info] Served:', url);
		}
	});
};


// send back some text/html data
const textRespond = (data) => {
	gresp.writeHead(200, { 'Content-Type': 'text/html' });
	gresp.end(data);
};


const performAction = async (parms) => {
	console.log(parms);
	if (parms.act=='ginf') {
		ytdl.getInfo(parms.yturl)
		.then(info => {
			//let drs = ytdl.downloadFromInfo(info, {filter: f => f.container === 'mp4' && f.mimeType.indexOf('audio/mp4') == 0});
			//let dws = fs.createWriteStream('video.mp4');
			//dws.on('end', () => textRespond('FF'));
			//drs.pipe(dws);
			//dws.end();

			// start the response to hold the browser timeout
			gresp.setHeader('Content-Disposition', 'attachment; filename="audio.m4a"');
		//	gresp.writeHead(200, { 'Content-Type': 'text/html' });
			gresp.writeHead(200, { 'Content-Type': 'application/octet-stream' });
		//	ytdl.downloadFromInfo(info, {filter: f => f.container === 'mp4' && f.mimeType.indexOf('audio/mp4') == 0}).pipe(fs.createWriteStream('video.mp4')).on('finish', () => {
			ytdl.downloadFromInfo(info, {filter: f => f.container === 'mp4' && f.mimeType.indexOf('audio/mp4') == 0}).pipe(gresp);	//.on('finish', () => {
			//	console.log('[Info] Audio extraction complete');
				//textRespond('EE');
				// finish the response
			//	gresp.end('~~~');
			//	});
			});
		//.then(() => textRespond('EE'))
		//;
//		let info = await ytdl.getInfo(parms.yturl);
//		let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
//		let format = ytdl.chooseFormat(audioFormats, { filter: format => format.container === 'mp4' });
//		ytdl.downloadFromInfo(info, {filter: f => f.container === 'mp4' && f.mimeType.indexOf('audio/mp4') == 0}).pipe(fs.createWriteStream('video.mp4'));
//		textRespond(JSON.stringify(format, null, "  "));
		return;
	}
	textRespond(`<span class="good">Playlist added to picture frame.</span>`);
};


const fmtSearch = (cntnr, fmts) => {
	let ix = 0;
	do {
		if (fmts[ix].container == cntnr) return ix;
		++ix;
	} while (ix < fmts.length);
	return 0;
}

const audioExtract = (parms) => {
	console.log(parms);
	let yturl = parms.axtr;
	let fext = 'mp4';
	ytdl.getInfo(yturl, {quality: 'highestaudio'})
	.then(info => {
		let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
		let tfmt = null;
		switch (parms.wtrk) {
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
	//	gresp.writeHead(200, {'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${parms.tnam}.${fext}"`});
		gresp.writeHead(200, {'Content-Type': tfmt.mimeType, 'Content-Length': tfmt.contentLength, 'Content-Disposition': `attachment; filename="${parms.tnam}.${fext}"`});
		ytdl(yturl,{format: tfmt}).pipe(gresp);
	});
};

// Web server
http.createServer(function (request, response) {
	const {method, url} = request;

	console.log('[Info] Requested:', url);
	if (debugMode === true && enableUrlDecoding === true) {
		console.log('[Debug] Decoded:', decodeURI(url));
	}

	gresp = response;

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
		audioExtract(parse(url.substring(2)));
		return;
	}
	if (url.startsWith('/?list')) {
		setPlaylist(parse(url.substring(2)));
		return;
	}
	if (url.startsWith('/?cmd')) {
		performCommand(parse(url.substring(2)));
		return;
	}
	if (url.startsWith('/?nplk')) {
		addPlaylist(parse(url.substring(2)));
		return;
	}
	if (url.startsWith('/?delp')) {
		delPlaylist(parse(url.substring(2)));
		return;
	}
	if (url.startsWith('/?refr')) {
		refrPlaylist(parse(url.substring(2)));
		return;
	}
	if (url.startsWith('/settings?')) {
		setSettings(parse(url.substring(10)));
		return;
	}

	let filePath = parse(url.substring(1));	///.split('?').shift();		//url.split('?').shift();	//url;

	// Correct root path
	if (filePath === '/') {
		filePath = documentRoot + '/index.html';
	}
	else {
		filePath = documentRoot + (enableUrlDecoding === true ? decodeURI(url) : url);
	}

	// serve the file
	serveFile(filePath.split('?').shift(), response, url);

}).listen(svrport, hostname, () => {
	console.log(`Picframe/Server (http://${hostname}:${svrport}) started`);
});

