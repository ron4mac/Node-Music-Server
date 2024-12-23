'use strict';
const cntrlr = require('../../controller');
const Connect = require('./connect');
const WebSocket = require('ws');

module.exports = class Pandora {

	constructor (client, mpdc, full=false) {
		this.client = client;
		this.mpdc = mpdc;
		this.queue = {};
		this.queuel = [];
		if (full) {
			this.ws = new WebSocket.Server({port:cntrlr.config.pandora_socket});
			this.ws.on('connection', (sc) => {
				sc.on('error', console.error);
				sc.on('message', (data) => {
					console.log('received: %s', data);
				});
				// if message was 'probe' send albumart to this one connection
				this.mpdc.status()
				.then((stat) => {
					let msg;
					if (stat.songid && this.queue[stat.songid]) {
						msg = {...{state: stat.state}, ...{snam: this.stationName}, ...this.queue[stat.songid]};
						console.log(msg);
					} else {
						return;		//msg = {state: stat.state};
					}
					sc.send(JSON.stringify(msg));
				});
			});
			this.#playSocket();
		}
	}

	static async init (mpdc, settings) {
		const client = new Connect(settings.pandora_user, settings.pandora_pass);
		let rslt = false;	//await this.#login(client);
		return rslt ? null : new Pandora(client, mpdc, true);
	}

	action (what, bobj, resp) {
		switch (what) {
		case 'home':
			this.authenticated()
			.then(yn => {
				if (yn) {
					let b = (bobj!=='undefined') ? atob(bobj) : '';
					this.browse(b, resp);
				} else {
					resp.write('<span class="warning">You are not authenticated with Pandora. ');
					resp.end('Please login to Pandora (upper-right user icon)</span>');
				}
			});
/*			if (!this.authenticated()) {
				resp.write('<span class="warning">You are not authenticated with Pandora. ');
				resp.end('Please login to Pandora (upper-right user icon)</span>');
				return;
			}
			console.log('p-brose');
			let b = (bobj!=='undefined') ? atob(bobj) : '';
			this.browse(b, resp);*/
			break;
		case 'play':
			this.play(bobj, resp);
			break;
		case 'lplay':
			this.lplay(bobj, resp);
			break;
		case 'clear':
			this.mpdc.clear();
			resp.end();
			break;
		case 'user':
			const file = this.client.authData ? 'user.html' : 'login.html';
			let htm = cntrlr.readFile('services/pandora/'+file+'', 'FAILED TO READ')
				.replace('%%UN%%',this.client.authData?.username)
				.replace('%%TA%%',this.client.authData?.timeoutMinutes)
				.replace('%%TR%%',this.client.authData?.timeoutMinutes - this.#remainingMinutes());
			resp.end(htm);
			break;
		case 'load':
			this.authenticated()
			.then(() => {
				resp.end(cntrlr.readFile('services/pandora/pandora.html', 'FAILED TO READ'));
			});
			break;
		case 'delete':
			if (this.client.authData) {
				this.client.request('station.deleteStation', {stationToken: bobj}, (err, nada) => {
					resp.end();
				});
			} else {
				resp.end('Not Authorized');
			}
			break;
		case 'search':
			if (this.client.authData) {
				this.client.request('music.search', {searchText: bobj, includeNearMatches: true, includeGenreStations: true}, (err, data) => {
				//	console.log(data);
					resp.write(this.#parseSearch(data));
					resp.end();
				});
			} else {
				resp.end('Not Authorized');
			}
			break;
		case 'add':
			if (this.client.authData) {
				this.client.request('station.createStation', bobj, (err, data) => {
					//console.log(data);
					let msg = data.stationName ? ('Created Station "'+data.stationName+'"') : 'FAILED TO CREATE STATION';
					resp.end(msg);
				});
			} else {
				resp.end('Not Authorized');
			}
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
		case 'reauth':
			console.log('re-authenticating');
			this.client.authData = null;
			this.#login(this.client, cntrlr.settings.pandora_user, cntrlr.settings.pandora_pass)
			.then(()=>{
				if (this.client.authData) {
					console.log(this.client.authData);
					resp.end();
				} else {
					resp.end('FAILED TO AUTHENTICATE');
				}
			});
			break;
		case 'logout':
			this.client.authData = null;
			cntrlr.deleteSettings(['pandora_user','pandora_pass']);
			this.#login(this.client, bobj.user, bobj.pass)
			resp.end();
			break;
		default:
			resp.end('Unknown webPandora: '+what);
			break;
		}
	}

	browse (surl, resp) {
		if (this.client.authData) {
			// can get image sizes .. 90,130,250,500,640,1080
			this.client.request('user.getStationList', {includeStationArtUrl: true, stationArtSize: 'W250H250'}, (err, stationList) => {
				//console.log(stationList);
				if (stationList) {
					resp.write(this.#parseStations(stationList.stations));
					resp.end();
				} else {
					console.log(err);
					resp.end('-- Failed connection to Pandora ... may need to refresh authorization --');
				}
			});
		} else {
			resp.end('-- NYA --');
		}
	}

	play (station, resp) {
		this.mpdc.sendCommand('clear');
		this.stationid = station.sid;
		this.stationName = station.snam;
		this.#getTracks();
		resp.end();
	}

	lplay (station, resp) {
		if (this.stationid != station.sid) this.queuel = [];
		this.stationid = station.sid;
		this.stationName = station.snam;
		this.#getLocalTrack(resp);
//		const trk = this.#getLocalTrack()
//		.then(resp.end(JSON.stringify(trk)));
	}

	// used to authenticate login
	async authenticated () {
		if (this.client.authData) return true;
		const sets = cntrlr.settings;
		if (!sets.pandora_user) return false;
		console.log('trying to authenticate');
		const yn = await this.#login(this.client, sets.pandora_user, sets.pandora_pass)
		.then(rslt => {
			console.log('pdor auth',rslt);
			return !rslt;
		});
		return yn;
	}


	// private methods
	#parseStations (list) {
		if (!list) return 'NOT YET RESOLVED';
		let htm = '';
		for (const s of list) {
			htm += '<div data-sid="'+s.stationId+'"><i class="fa fa-bars bmnu" aria-hidden="true" onclick="Pand.more(event)"></i>';
			htm += '<a href="#'+s.stationId.substr(-6)+'" onclick="Pand.play(event)">'+s.stationName+'</a> <i class="fa fa-headphones lplay" onclick="Pand.lplay(event)"></i></div>'
		}
		return htm;
	}

	#parseSearch (rslt) {
		let htm = '';
		if (rslt.songs && rslt.songs.length) {
			htm += '<div class="subs">By Songs</div>';
			rslt.songs.forEach((s)=>{
				htm += '<div data-mtkn="'+s.musicToken+'"><i class="fa fa-plus-square-o" aria-hidden="true" onclick="Pand.add(event,\'song\')"></i>'+s.artistName+' :: '+s.songName+'</div>';
			});
		}
		if (rslt.artists && rslt.artists.length) {
			htm += '<div class="subs">By Artists</div>';
			rslt.artists.forEach((a)=>{
				htm += '<div data-mtkn="'+a.musicToken+'"><i class="fa fa-plus-square-o" aria-hidden="true" onclick="Pand.add(event,\'artist\')"></i>'+a.artistName+'</div>';
			});
		}
		if (rslt.genreStations && rslt.genreStations.length) {
			htm += '<div class="subs">By Genres</div>';
			rslt.genreStations.forEach((g)=>{
				htm += '<div data-mtkn="'+g.musicToken+'"><i class="fa fa-plus-square-o" aria-hidden="true" onclick="Pand.add(event,\'song\')"></i>'+g.stationName+'</div>';
			});
		}
		return htm;
	}

	#getLocalTrack (resp) {
		//console.log('LOCAL QUEUE', this.queuel);
		let needed = true;
		if (this.queuel.length) {
			resp.end(JSON.stringify(this.queuel.shift()));
			needed = false;
		}
		if (!this.queuel.length) this.#getTracks((items)=>{
			for (const t of items) {
				if (t.additionalAudioUrl) {
					const trk = {
						audioUrl: t.additionalAudioUrl,
						snam: this.stationName,
						artistName: t.artistName,
						albumName: t.albumName,
						songName: t.songName,
						albumArtUrl: t.albumArtUrl
					};
					this.queuel.push(trk);
				} else {
					console.log(t);
				}
			}
			if (needed) resp.end(JSON.stringify(this.queuel.shift()));
		});
	}

	#getTracks (cb=null) {
		let gplp = {stationToken: this.stationid, additionalAudioUrl: 'HTTP_128_MP3'};
		this.client.request('station.getPlaylist', gplp, (err, playlist) => {
			if (err) {
				console.error(err);
			//	setTimeout(()=>this.#getTracks, 15000);
				if (cb) cb([]);
			} else {
		//	console.log(playlist);
				if (playlist) {
					if (cb) {
						cb(playlist.items);
					} else {
						this.#queueTracks(playlist.items);
					}
				}
			}
		});
	}

	#queueTracks (items) {
		try {
			for (const t of items) {
				if (t.additionalAudioUrl) {
					this.mpdc.sendCommand('addid '+t.additionalAudioUrl)
					.then((rslt) => {
						let id = rslt.match(/\d+/)[0];
						console.log('add id',id);
						this.queue[id] = {
							artistName: t.artistName,
							albumName: t.albumName,
							songName: t.songName,
							albumArtUrl: t.albumArtUrl
						};
						this.lastAddedId = id;
					});
				} else {
					console.log(t);
				}
			}
			this.mpdc.sendCommand('play');
		} catch (error) {
			console.error(error);
		}
	}

	#playSocket () {
		if (this.ws) {
			this.mpdc.mpdc.on('system-player', (a,b) => {
				if (!this.client.authData) return;
				console.log('pdo on system player event ',a,b);
				this.mpdc.status()
				.then((stat) => {
					//console.log(stat);
					console.log(stat.song+'/'+stat.playlistlength);
					let msg;
					if (stat.songid && this.queue[stat.songid]) {
						msg = {...{state: stat.state}, ...{snam: this.stationName}, ...this.queue[stat.songid]};
						if (stat.playlistlength-stat.song < 2) {
							this.#getTracks();
						}
						if ((stat.playlistlength > 15)&&(stat.song>7)) {
							this.mpdc.sendCommand('delete 0:4')
							.then(()=>this.#cleanQueue());
						}
					} else {
						msg = {state: 'stop'};
					}
					console.log(msg);
					this.ws.clients.forEach((client) => {
						if (client.readyState === WebSocket.OPEN) {
							client.send(JSON.stringify(msg));
						}
					});
				});
			});
		}
	}

	#cleanQueue () {
		//clean up defunct queue info
		let base = this.lastAddedId - 20;
		for (const qid in this.queue) {
			if (qid<base) delete this.queue[qid];
		}
	}

	#remainingMinutes () {
		return (Date.now()-this.client.authData?.startTime)/60000|0;
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

}
