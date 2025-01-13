'use strict';
const MPD = require('mpd2');
const WebSocket = require('ws');
const cntrlr = require('./controller');
const mpdConnOpts = {path: '/run/mpd/socket'};

module.exports = class MyMPD {

	constructor (mpdc, status, full=false) {
		this.mpdc = mpdc;
		this.mstatus = status;
		if (full) {
			// create a socket
			this.ws = new WebSocket.Server({port: cntrlr.config.socket});
			this.ws.on('connection', (sc) => {
				sc.on('error', console.error);
				sc.on('message', (data) => {
					//console.log('MPD received: %s', data);
					this.#socketRequest(data)
					.then(reply => {
						//console.log('reply ',reply);
						sc.send(JSON.stringify({state: this.mstatus.state, track: reply}));
					});
				});
			});
			// register for events from MPD
//			this.mpdc.on('system-player', (a,b) => {
//				this.status()
//				.then(s=>console.log('on system player event ',s,a,b));
//			});
			this.mpdc.on('system', name => {
				//console.log('on system event: %s', name);
				this.status()
				.then((s)=> {
				//	console.log('*mpd* ', s);
					if (name=='playlist') {
						this.#broadcastTrack();
					} else {
						this.#broadcastState();
					}
				});
			});
			this.clients = [];
		}
	}

	static async init () {
		let mop = mpdConnOpts;
		//mop = {port:6600, host: 'localhost'};
		try {
			const mpdc = await MPD.connect(mop);
			const status = await mpdc.sendCommand('status').then(MPD.parseObject);
			return new MyMPD(mpdc,status,true);
		} catch (err) {
			console.error(err);
			cntrlr.errors.push('Could not connect to MPD daemon');
			return null;
		}
	}

	async getVolume () {
	//	this.status()
	//	.then( () => {
		let rslt = await this.status();
		//console.log('status::',this.mstatus);
		return this.mstatus.volume;
	//	});
	}

	setVolume (vol) {
		this.#sendCommand('setvol '+vol);
	}

	async bumpVolume (pm) {
		await this.#sendCommand('volume '+pm);
		await this.status();
		return this.mstatus.volume;
	}

	clear () {
		this.#sendCommand('clear');
	}

	sendCommand (cmd) {
		return this.#sendCommand(cmd);
	}

	sendCommands (cmds) {
		this.#sendCommands(cmds);
	}

	async sendCommandB (cmd) {
		try {
			return await this.mpdc.sendCommand(cmd);
		} catch (error) {
			return JSON.stringify(error);
		}
	}

	parseData (data) {
		return MPD.parseObject(data);
	}

	register (what) {
		
	}

	async status () {
		//console.log('status');
		this.mstatus = await this.mpdc.sendCommand('status').then(MPD.parseObject);
		return this.mstatus;
	}


	// PRIVATE METHODS
	async #sendCommand (cmd) {
		try {
			let rslt = await this.mpdc.sendCommand(cmd);
			return rslt;
		} catch (error) {
			console.error(cmd, error);
		}
	}

	async #sendCommands (cmds) {
		let rslt = await this.mpdc.sendCommands(cmds);
	}

	async #socketRequest (msg) {
		const info = await this.mpdc.sendCommand('playlistinfo').then(MPD.parseObject);
	//	console.log('@mpd.@\n', info)
		return info ? (info.title ? info.title : 'NYET') : '?-?-?';
	}

	#broadcastTrack () {
		this.#sendCommand('playlistinfo')
		.then((resp) => {
			//console.log('@mpd@\n', resp);
			const info = MPD.parseObject(resp);
			if (info && info.title) {
				this.#broadcast({state: this.mstatus.state, track: info.title});
			}
		});
	}

	#broadcastState () {
		this.#broadcast({state: this.mstatus.state});
	}

	#broadcast (msg) {
		this.ws.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(msg));
			}
		});
	}

}