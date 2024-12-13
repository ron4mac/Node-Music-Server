'use strict';
const cntrlr = require('../../controller');
const https = require('https');
const qs = require('querystring');
const SpotifyWebApi = require('./spotify-web-api/server');

//const fs = require('fs');

module.exports = class Spotify {

	constructor (client, mympd) {
		this.mpdc = mympd;
		this.client = client;
		this.client.setAccessToken(cntrlr.getSetting('spotify_token', null));
		this.client.setRefreshToken(cntrlr.getSetting('spotify_refresh', null));
		this.client.setRedirectURI('http://pifourb.local:6680/_sp.callback');
		this.expiration = Date.now();
	}

	static async init (mpdc, settings) {
		const client = new SpotifyWebApi({});
		return new Spotify(client, mpdc, true);
		//const client = new Connect(settings.pandora_user, settings.pandora_pass);
		//let rslt = false;	//await this._login(client);
		//return rslt ? null : new Pandora(client, mpdc, true);
	}

	action (what, bobj, resp) {
		//console.log(what,bobj);
		switch (what) {
		case 'home':
			this.#authorized()
			.then(yn => {
				if (yn) {
					const b = (bobj!=='undefined') ? bobj : '';
					this.browse(b, resp);
				} else {
					resp.write('<span class="warning">You are not authorized with Spotify. ');
					resp.end('Please login to Spotify (upper-right user icon)</span>');
				}
			});
			break;
		case 'nav':
			//console.log(bobj);
			const [what,id] = bobj.split('.');
			switch(what) {
			case 'cat':
				this.client.getPlaylistsForCategory(id)
				//this.client.getUserPlaylists()
				.then(rslt=>{
					//console.log(rslt);
					resp.end();
				});
				break;
			case 'alb':
				this.client.getAlbumTracks(id)
				.then(rslt=>{
					//console.dir(rslt,{depth:4});
					this.#displayTracks(rslt, resp);
					resp.end();
				})
				.catch(err=>{
					console.log(err);
					resp.end();
				});
				//resp.end();
				break;
			case 'pll':
				this.client.getPlaylist(id)
				.then(rslt=>{
					//console.dir(rslt.tracks,{depth:3});
					this.#displayTracks(rslt.tracks, resp);
					resp.end();
				//	this.client.getMyDevices()
				//	.then(rslt=>console.log('DEVICES ',rslt));
				});
				//resp.end();
				break;
			case 'trk':
				this.client.play({device_id: '076a47815b5316506aeff7b527e50ed20fdeb51a', 'uris': [id]})
				.then(rslt=>{
					//console.log(rslt);
					resp.end();
				});
				break;
			case 'mylists':
				this.client.getUserPlaylists()
				.then(rslt=>{
					//console.log(rslt);
					this.#displayPlaylists(rslt, resp);
					resp.end();
				});
				break;
			}
			//resp.end();
			break;
		case 'search':
			this.#search(bobj, resp)
			.then(()=>resp.end())
			.catch((err)=>resp.end('SEARCHerror',err.message));
			break;
		case 'next':
			this.#next(bobj, resp)
			.then((d)=>console.log('NEXTresp',d))		//resp.end('NEXTresp',d))
			.catch((err)=>console.log(err));
			break;
		case 'play':
			this.client.play({device_id: '076a47815b5316506aeff7b527e50ed20fdeb51a', 'context_uri': bobj})
			.then(rslt=>{
				//console.log(rslt);
				resp.end();
			});
			break;
		case 'lplay':
			this.lplay(bobj, resp);
			break;
		case 'clear':
			this.mpdc.clear();
			resp.end();
			break;
		case 'user':
			const perms = [
				'user-read-private',
				'user-read-email',
				'streaming',
				'user-read-playback-state',
				'user-modify-playback-state'
			];
			const rdir = this.client.createAuthorizeURL(perms, Date.now().toString(16), true);
			//console.log('RDIR',rdir);
			//resp.writeHead(302,  {Location: rdir});
			//resp.end(`<script>window.location="${rdir}"</script>`);
			resp.end(rdir);
			break;
			const htm = cntrlr.readFile('services/spotify/login.html', 'FAILED TO READ')
			.replace('%%authurl%%',rdir);
			resp.write(htm);
			resp.end();
			break;
		case 'login':
			this.#login(this.client, bobj.user, bobj.pass)
			.then(()=>{
				if (this.client.authData) {
					cntrlr.setSettings({pandora_user: bobj.user, pandora_pass: bobj.pass});
					resp.end();
				} else {
					resp.end('FAILED TO AUTHENTICATE');
				}
			});
			break;
		case 'playctl':
			switch(bobj) {
			case 'stop':
				this.client.pause();
				break;
			case 'prev':
				this.client.skipToPrevious();
				break;
			case 'next':
				this.client.skipToNext();
				break;
			}
			resp.end();
			break;
		case 'state':
			this.#authorized()
			.then(()=>{
				this.client.getMyCurrentPlaybackState()
				.then(rslt=>{
					console.log('PLAYBACK-STATE',rslt);
					resp.end(JSON.stringify(rslt));
				});
			})
			.catch(err=>console.error(err));
			break;
		case 'logout':
			this.user = '';
			this.userToken = '';
			cntrlr.deleteSetting('calmradio_user');
			cntrlr.deleteSetting('calmradio_token');
			resp.end();
			break;
		case 'callback':
			//console.log(bobj);
			const code = bobj.qry.code;
		//	cntrlr.setSettings({spotify_auth: code});
			this.client.authorizationCodeGrant(code)
			.then((prms)=>{
				//console.log('WTF',prms);
				cntrlr.setSettings({spotify_auth: code, spotify_token: prms.access_token, spotify_refresh: prms.refresh_token});
			});

			resp.end();
			break;
		case 'load':
				resp.end(cntrlr.readFile('services/spotify/spotify.html', 'FAILED TO READ'));
			break;
		default:
			resp.end('Unknown webSpotify: '+what);
			break;
		}
	}

	browse (surl, resp) {
		//console.log('browseSurl',surl);
		this.client.getCategories({queryParameters:{limit:40}})
		.then(rslt=>{
			//console.log('CATEGORIES',rslt);
			this.#displayCategories(rslt.categories.items, resp);
			//resp.end();
		});
	}

	play (which, resp) {
		this._getChanData()
		.then(() => {
			const chan = this.chns[which];
			let stream;
			if (this.userToken) {
				const cred = '?' + qs.stringify({user: this.user, pass: this.userToken});
				const rate = cntrlr.getSetting('calmradio_bitrate', 192);
				stream = chan.vip[0].streams[rate] + cred;
				console.log(stream);
			} else {
				stream = chan.free[0].streams[128];
				console.log(stream);
			}
			try {
				this.mpdc.sendCommand('clear');
				this.mpdc.sendCommand('add "'+stream+'"');
				this.mpdc.sendCommand('play');
			} catch (error) {
				console.error(error);
			}
		});
		resp.end();
	}

	lplay (which, resp) {
		this._getChanData()
		.then(() => {
			const chan = this.chns[which];
			let stream;
			if (this.userToken) {
				const cred = '?' + qs.stringify({user: this.user, pass: this.userToken});
				const rate = cntrlr.getSetting('calmradio_bitrate', 192);
				stream = chan.vip[0].streams[rate] + cred;
				console.log(stream);
			} else {
				stream = chan.free[0].streams[128];
				console.log(stream);
			}
			resp.end(stream);
		});
		//resp.end();
	}

	/* PRIVATE METHODS BELOW HERE */

	async #authorized () {
		const token = cntrlr.getSetting('spotify_token', false);
		if (!token) return false;
		if (this.expiration - Date.now() < 300000) {
			const yn = await this.client.refreshAccessToken()
			.then(rslt=>{
				//console.log('REFRESH',rslt);
				const tok = rslt.access_token;
				cntrlr.setSettings({spotify_token: tok});
				this.client.setAccessToken(tok);
				if (rslt.refresh_token) {
					cntrlr.setSettings({spotify_refresh: rslt.refresh_token});
					this.client.setRefreshToken(rslt.refresh_token);
				}
				this.expiration = Date.now() + rslt.expires_in*1000;
				return true;
			});
			return yn;
		}
		return true;
	}

	async #search (parms, resp) {
		if (!Array.isArray(parms['types[]'])) parms['types[]'] = [parms['types[]']];
		const rslt = await this.client.search(parms.sterm,parms['types[]'])
		.then((data)=>{
			//console.dir(data, {depth:5});
			if (data.albums) {
				this.#displayAlbums(data.albums, resp);
			}
			if (data.tracks) {
				this.#displayTracks(data.tracks, resp);
			}
			if (data.playlists) {
				this.#displayPlaylists(data.playlists, resp);
			}
			return data;
		});
		//console.dir(rslt,{depth:3});
		return rslt;
	}

	async #next (parms, resp) {
		//const [what,uri] = parms.split('.',2);console.log(what,uri);
		const what = parms.substr(0,3);
		const uri = parms.substr(4);
		this.client.getRawUri(uri,{headers:{Authorization: 'Bearer ' + cntrlr.getSetting('spotify_token', false)}},(err,data)=>{
			//console.log(err,data);
			switch(what) {
			case 'alb':
				this.#displayAlbums(data.albums, resp);
				break;
			case 'trk':
				this.#displayTracks(data.tracks, resp);
				break;
			case 'pll':
				this.#displayPlaylists(data.playlists, resp);
				break;
			}
			resp.end();
		});
	}


	#login (client, user, pass) {
		return new Promise((resolve, reject) => {
			try {
				client.login(user, pass, (err) => {
					if (err) {
						console.log(err);
						resolve('Login Failure');
					} else {
						console.log('Pandora Ready!');
						resolve();
					}
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	#displayTracks (data, resp) {
	console.log(data);
		if (data.offset + data.limit < data.total) {
			resp.write('<div class="sheader"><h4>TRACKS</h4><a href="#" data-next="trk.'+data.next+'">More</a></div>');
		}
		data.items.forEach((itm) => {
			if (itm) {
				if (itm.track) itm = itm.track;
				resp.write('<div class="spot-link" data-url="trk.'+itm.uri+'">');
				resp.write('<a href="#.'+itm.id+'">'+itm.name+'</a></div>');
			}
		});
		//resp.end();
	}

	#displayAlbums (data, resp) {
		if (data.offset + data.limit < data.total) {
			resp.write('<div class="sheader"><h4>ALBUMS</h4><a href="#" data-next="alb.'+data.next+'">More</a></div>');
		}
		data.items.forEach((itm) => {
			if (itm) {
				resp.write('<div class="spot-link" data-url="alb.'+itm.id+'">');
				let pimg = this.#image(itm.images);
				resp.write('<img src="'+pimg+'" data-uri="'+itm.uri+'">');
				resp.write('<a href="#.'+itm.id+'">'+itm.name+'</a></div>');
			}
		});
		//resp.end();
	}

	#displayPlaylists (data, resp) {
		if (data.offset + data.limit < data.total) {
			resp.write('<div class="sheader"><h4>PLAYLISTS</h4><a href="#" data-next="pll.'+data.next+'">More</a></div>');
		}
		data.items.forEach((itm) => {
			if (itm) {
				resp.write('<div class="spot-link" data-url="pll.'+itm.id+'">');
				let pimg = this.#image(itm.images);
				resp.write('<img src="'+pimg+'" data-uri="'+itm.uri+'">');
				resp.write('<a href="#.'+itm.id+'">'+itm.name+'</a></div>');
			}
		});
		//resp.end();
	}

	#image (images, size=300) {
		let image = images[0].url;
		images.forEach(img=>{ if (img.height==size) image = img.url; });
		return image;
	}

	#displayCategories (which, resp) {
		which.forEach((cat) => {
			resp.write('<div class="spot-link" data-url="cat.'+cat.id+'">');
			resp.write('<a href="#.'+cat.id+'">'+cat.name+'</a></div>');
		});
		resp.end();
	}

	_displayCategory (which, resp) {
		const chs = this.cats[which].channels;
		chs.forEach((c) => {
			const g = this.chns[c];
			if (!this.userToken && !g.free[0]) {
				resp.write('<div class="calm-noplay"><img src="'+CRURLS.arts+g.img+'" class="noplay"><span>'+g.title+'</span></div>');
			} else {
				resp.write('<div class="calm-play" data-url="'+c+'"><img src="'+CRURLS.arts+g.img+'">');
				resp.write('<a href="#..'+c+'">'+g.title+'</a> <i class="fa fa-headphones lplay"></i></div>');
			}
		});
		resp.end();
	}

	_camel (string) {
		return string.toLowerCase().split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
	}

	_parseMetadata (data) {
		let rows = {};
		let cats = {}
		for (let row of data.metadata.rows) {
			let arow = []
			arow['id'] = row.id
			arow['title'] = this._camel(row['title'])
			arow['cats'] = row['categories'] || [row['category']]
			arow['art'] = row['background_art_url']
			rows[row['id']] = arow
		}
		for (let cat of data.metadata.categories) {
			let acat = []
			acat['id'] = cat.id
			acat['title'] = this._camel(cat['title'])
			acat['img'] = cat['square_art_url'] || cat['tiny_square_art_url'] || cat['hd_square_art_url'] || cat['background_art_url']
			acat['channels'] = cat['channels']
			cats[cat['id']] = acat
		}
		//console.log(cats);
		return {rows: rows, cats: cats}
	}

	_parseChannels (data) {
		let chns = []
		for (let chn of data.channels) {
			let achn = []
			achn['title'] = this._camel(chn['title'])
			achn['desc'] = chn['md_description'] || chn['description']
			achn['img'] = chn['square_art_url'] || chn['hd_square_art_url'] || chn['tiny_square_art_url']
			achn['story'] = chn['story']
			achn['cat'] = chn['category'] || 999
			achn['vip'] = chn['vip']
			achn['free'] = chn['free']
			chns[chn['id']] = achn
		}
		return chns
	}

	_getMetaData () {
		return new Promise((resolve, reject) => {
			if (this.grps) resolve();
			try {
				https.get(CRURLS.categories, (r) => {
					let dat = '';
					r.on('data', (chunk) => {
						dat += chunk;
					}).on('end', () => {
						const parsed = this._parseMetadata(JSON.parse(dat));
						this.grps = parsed.rows;
						this.cats = parsed.cats;
						resolve();
					});
				}).end();
			} catch (error) {
				reject(error);
			}
		});
	}

	_getChanData () {
		return new Promise((resolve, reject) => {
			if (this.chns) resolve();
			try {
				https.get(CRURLS.channels, (r) => {
					let dat = '';
					r.on('data', (chunk) => {
						dat += chunk;
					}).on('end', () => {
						this.chns = this._parseChannels(JSON.parse(dat));
						resolve();
					});
				}).end();
			} catch (error) {
				reject(error);
			}
		});
	}


}
