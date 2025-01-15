const config = require('./config');
const cntrlr = require('./controller');
const http = require('http');
const https = require('https');
const process = require('process');
const {parse} = require('querystring');
const fs = require('fs');
const path = require('path');
const MyMPD = require('./mpd.js');

const hostname = process.env.NODE_WEB_HOST || '0.0.0.0';
const debugMode = false;

const settings = cntrlr.getSettings();

const enableUrlDecoding = true;
const documentRoot = '.';

// polyfills
if (typeof btoa === 'undefined') global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
if (typeof atob === 'undefined') global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');

var errs = [];
var mympd = null;

// class instances for services
var favorites = null,
	tunein = null,
	calmradio = null,
	pandora = null,
	spotify = null,
	playlists = null,
	fileman = null,
	ytextract = null;


/* initiations for the various services */
const webFavorites = async (what, bobj, resp) => {
	if (!favorites) {
		if (!mympd) {
			mympd = await MyMPD.init();
		}
		favorites = new (require('./services/favorites/favorites'))(mympd);
	}
	favorites.action(what, bobj, resp);
};

const webRadio = async (what, bobj, resp) => {
	if (!tunein) {
		if (!mympd) {
			mympd = await MyMPD.init();
		}
		tunein = new (require('./services/tunein/tunein'))(mympd);
	}
	tunein.action(what, bobj, resp);
};

const webCalm = async (what, bobj, resp) => {
	if (!calmradio) {
		if (!mympd) {
			mympd = await MyMPD.init();
		}
		calmradio = new (require('./services/calmradio/calmradio'))(mympd);
	}
	calmradio.action(what, bobj, resp);
};

const webPandora = async (what, bobj, resp) => {
	if (!pandora) {
		if (!mympd) {
			mympd = await MyMPD.init();
		}
		pandora = await (require('./services/pandora/pandora')).init(mympd, settings);
	}
	pandora.action(what, bobj, resp);
};

const webSpotify = async (what, bobj, resp) => {
	if (!spotify) {
		if (!mympd) {
			mympd = await MyMPD.init();
		}
		spotify = await (require('./services/spotify/spotify')).init(mympd, settings);
	}
	spotify.action(what, bobj, resp);
};

const webFileman = async (what, bobj, resp) => {
	if (!fileman) {
		fileman = new (require('./services/fileman/fileman'))();
	}
	fileman.action(what, bobj, resp);
};

const webYtextr = async (what, bobj, resp) => {
	if (!ytextract) {
		ytextract = new (require('./services/ytextract/ytextract'))();
	}
	ytextract.action(what, bobj, resp);
};

const webLists = async (what, bobj, resp) => {
	if (!playlists) {
		if (!mympd) {
			mympd = await MyMPD.init();
		}
		playlists = new (require('./services/playlists/playlists'))(mympd);
	}
	playlists.action(what, bobj, resp);
};


/* route requests to the targeted service */
const f_commands = {
	fa: webFavorites,
	ti: webRadio,
	cr: webCalm,
	pd: webPandora,
	sp: webSpotify,
	fm: webFileman,
	yt: webYtextr,
	pl: webLists
};

const p_router = (service, parms, resp) => {
	console.log(service, parms);
	f_commands[service](parms.what, parms.bobj??'', resp);
}

const g_router = (parms, resp) => {
	console.log(parms);
	f_commands[parms._](parms.act, parms, resp);
}


/* MPD control actions */
const mpdCtrl = async (what, bobj, resp) => {
	if (!mympd) {
		mympd = await MyMPD.init();
	}
	if (!mympd) return;
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


const reqAction = (parms, resp) => {
	console.log(parms);
	let rmsg = 'NOT YET IMPLEMENTED (FMA)';
	resp.writeHead(200, {'Content-Type': 'text/plain'});
	let pbase, fpath, stats;
	switch (parms.act) {
	case 'plply':
		queMPD(parms.files);
	//	let plst = '';
	//	for (const file of parms.files) {
	//		plst += config.playlistDir+file + "\n";
	//		fs.unlinkSync(fpath);
	//	}
		rmsg = null;
		break;
	case 'pldel':
		for (const file of parms.files) {
			fpath = config.playlistDir+file;
			fs.unlinkSync(fpath);
		}
		rmsg = null;
		break;
	case 'plvue':
		rmsg = JSON.stringify({err:'', pl:fs.readFileSync(config.playlistDir+parms.file,{encoding:'utf8'})});
		break;
	case 'mpd':
		mpdCtrl(parms.what, parms.bobj??'', resp);
		return;
		break;
	case 'spract':
		if (parms.spract == 'b') {
			rmsg = 'Rebooting server ... refresh page in a minute or two';
			require('child_process').exec('/usr/bin/systemctl reboot',{},(error, stdout, stderr)=>{
				if (error) { console.error(stderr) } else { console.log(stdout) }
			});
		}
		if (parms.spract == 'r') {
			rmsg = 'Restarting music server ... refresh page';
			require('child_process').exec('/usr/bin/systemctl restart ytextr',{},(error, stdout, stderr)=>{
				if (error) { console.error(stderr) } else { console.log(stdout) }
			});
		}
		break;
	}
	resp.end(rmsg);
}

const runScript = (file, url, response) => {
	//console.log('SCRIPT: '+url);
	file = file.replace(/^\.\//,'');
	let param = url.substr(url.indexOf('?')+1);
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
const serveFile = (url, response) => {
	let filePath = parse(url.substring(1));
	// Correct root path
	if (filePath === '/') {
		filePath = documentRoot + '/index.html';
	} else {
		filePath = documentRoot + (enableUrlDecoding === true ? decodeURI(url) : url);
	}
	filePath = filePath.split('?').shift();

	//console.log('SERVE FILE: '+filePath);
	const extname = String(path.extname(filePath)).toLowerCase();
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
		ytextract.progv = 'Scanning playlist ...';
		ytextract.sendzip(filePath, response);
		return;
	}

	if (extname == '.php') {
		runScript(filePath, url, response);
		return;
	}

	// Serve static files
	fs.readFile(filePath, function(error, content) {
		if (error) {
			if (error.code === 'ENOENT') {
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
				fs.readFile(filePath+'/index.html', 'utf8', function(error, content) {
					if (error) { console.error(error); }
					else {
						let errs = '';
						if (cntrlr.errors) {
							errs += '<div class="errors">';
							cntrlr.errors.forEach((e)=>{
								errs += '<p>'+e+'</p>';
							});
							errs += '</div>'
						}
						content = content.replace('%%ERRORS%%', errs);
						response.setHeader('Cache-Control', ['no-cache','no-store','must-revalidate']);
						response.setHeader('Pragma', 'no-cache');
						response.writeHead(200, { 'Content-Type':'text/html' });
						response.end(content);
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
		} else {
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


console.log(cntrlr.getSettings());
// some things have to be fully initialized ahead
const pre_init = async () => {
	mympd = await MyMPD.init();
};
pre_init();


// Web server
http.createServer(function (request, response) {
	const {method, url} = request;

	if (url.startsWith('/?upld')) {
		fileman.receiveUpload(request, response);
		return;
	}

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
			if (url.startsWith('/?_Q')) {	// general post request
				let rdata = request.headers['content-type'] == 'application/json' ? JSON.parse(body) : parse(body);
				reqAction(rdata, response);
				return;
			}
			if (url.startsWith('/_')) {		// post routed to specific service
				let rdata = request.headers['content-type'] == 'application/json' ? JSON.parse(body) : parse(body);
				p_router(url.substr(2), rdata, response);
				return;
			}
			// serve the file
			serveFile(url, response, url);
		});
		return;
	}

	if (url.startsWith('/_')) {
		const [upth,qry] = url.split('?');
		const [svc,act] = upth.substring(2).split('.');
		g_router({_:svc, act:act, qry:parse(qry)}, response);
		return;
	}
	if (url.startsWith('/?_')) {
		g_router(parse(url.substring(2)), response);
		return;
	}

	// serve the file
	serveFile(url, response);

}).listen(config.port, hostname, () => {
	console.log(`YT Audio Extraction Server (http://${hostname}:${config.port}) started`);
});

