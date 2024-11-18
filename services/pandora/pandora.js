'use strict';
const Connect = require('./connect');
const WebSocket = require('ws');
const iOSpartnerInfo = {
		username: 'iphone',
		password: 'P2E4FC0EAD3*878N92B2CDp34I0B1@388137C',
		deviceModel: 'IP01',
		decryptPassword: '20zE1E47BE57$51',
		encryptPassword: '721^26xE22776'
	};


module.exports = class Pandora {

	constructor (client, mpdc, full=false) {
		this.client = client;
		this.mpdc = mpdc;
		this.queue = {};
		if (full) {
			this.ws = new WebSocket.Server({port:6681});
			this.ws.on('connection', (sc) => {
				sc.on('error', console.error);
				sc.on('message', (data) => {
					console.log('received: %s', data);
				});
				// if message was 'probe' send albumart to this one connection
				this.mpdc._status()
				.then((stat) => {
					if (stat.songid) {
						let msg = JSON.stringify(this.queue[stat.songid]);
						console.log(msg);
						sc.send(msg);
					}
				});
			});
			this._playSocket();
		}
	}

	static async init (mpdc, settings) {
		const client = new Connect(settings.pandora_user, settings.pandora_pass, iOSpartnerInfo);
		let rslt = await this._login(client);
		return rslt ? null : new Pandora(client,mpdc,true);
	}

	browse (surl, resp) {
		if (this.client.authData) {
		this.client.request('user.getStationList', (err, stationList) => {
		//	console.log(stationList);
			if (stationList) {
				resp.end(this._parseStations(stationList.stations));
			} else {
				console.log(err);
				resp.end('-- nope --');
			}
		});
		} else {
			resp.end('-- NYA --');
		}
	}

	play (stationid, resp) {
		this.stationid = stationid;
		this._getTracks();
		resp.end();
	}

	static authenticate (parms) {
		const client = new Connect(parms.user, parms.pass);
		return this._login(client);
	}

	// private methods
	_parseStations (list) {
		if (!list) return 'NOT YET RESOLVED';
		let htm = '';
		for (const s of list) {
			htm += '<div><a href="#" data-sid="'+s.stationId+'" onclick="pandoraPlay(event)">'+s.stationName+'</a></div>'
		}
		return htm;
	}

	_getTracks () {
		let gplp = {stationToken: this.stationid, additionalAudioUrl: 'HTTP_128_MP3'};
		this.client.request('station.getPlaylist', gplp, (err, playlist) => {
			if (err) {
				console.error(err);
				setTimeout(()=>this._getTracks, 15000);
			} else {
				if (playlist) this._queueTracks(playlist.items);
			}
		});
	}

	_queueTracks (items) {
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

	_playSocket () {
		if (this.ws) {
			this.mpdc.mpdc.on('system-player', (a,b) => {
				console.log('pdo on system player event ',a,b);
				this.mpdc._status()
				.then((stat) => {
					//console.log(stat);
					console.log(stat.song+'/'+stat.playlistlength);
					if (stat.songid) {
						let msg = JSON.stringify(this.queue[stat.songid]);
						console.log(msg);
						this.ws.clients.forEach((client) => {
							if (client.readyState === WebSocket.OPEN) {
								client.send(msg);
							}
						});
						if (stat.playlistlength-stat.song < 2) {
							this._getTracks();
						}
						if ((stat.playlistlength > 15)&&(stat.song>7)) {
							this.mpdc.sendCommand('delete 0:4')
							.then(()=>this._cleanQueue());
						}
					}
				});
			});
		}
	}

	_cleanQueue () {
		//clean up defunct queue info
		let base = this.lastAddedId - 20;
		for (const qid in this.queue) {
			if (qid<base) delete this.queue[qid];
		}
	}

	static _login (client) {
		return new Promise((resolve, reject) => {
			try {
				client.login((err) => {
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
