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
					console.log('MPD received: %s', data);
					this._socketRequest(data)
					.then(reply => {
						console.log('reply ',reply);
						sc.send(JSON.stringify({state: this.mstatus.state, track: reply}));
					});
				});
			});
			// register for events from MPD
//			this.mpdc.on('system-player', (a,b) => {
//				this._status()
//				.then(s=>console.log('on system player event ',s,a,b));
//			});
			this.mpdc.on('system', name => {
				console.log('on system event: %s', name);
				this._status()
				.then((s)=> {
					console.log('*mpd* ', s);
					if (name=='playlist') {
						this._broadcastTrack();
					} else {
						this._broadcastState();
					}
				});
			});
			this.clients = [];
		}
	}

	static async init () {
		let mop = mpdConnOpts;
		//mop = {port:6600, host: 'localhost'};
		const mpdc = await MPD.connect(mop);
		const status = await mpdc.sendCommand('status').then(MPD.parseObject);
		return new MyMPD(mpdc,status,true);
	}

	async getVolume () {
	//	this._status()
	//	.then( () => {
		let rslt = await this._status();
		//console.log('status::',this.mstatus);
		return this.mstatus.volume;
	//	});
	}

	setVolume (vol) {
		this._sendCommand('setvol '+vol);
	}

	async bumpVolume (pm) {
		await this._sendCommand('volume '+pm);
		await this._status();
		return this.mstatus.volume;
	}

	clear () {
		this._sendCommand('clear');
	}

	sendCommand (cmd) {
		return this._sendCommand(cmd);
	}

	sendCommands (cmds) {
		this._sendCommands(cmds);
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


	// PRIVATE METHODS
	async _connect () {
		console.log('mpdconnect');
		try {
			let mop = mpdConnOpts;
			//mop = {port:6600, host: 'localhost'};
		//	this.mpdc = await MPD.connect(mop);
			return await MPD.connect(mop);
		} catch (error) {
			console.error(error);
		}
	}

	async _status () {
		//console.log('status');
		this.mstatus = await this.mpdc.sendCommand('status').then(MPD.parseObject);
		return this.mstatus;
	}

	async _sendCommand (cmd) {
		try {
			let rslt = await this.mpdc.sendCommand(cmd);
			return rslt;
		} catch (error) {
			console.log(cmd);
			console.error(error);
		}
	}

	async _sendCommands (cmds) {
		let rslt = await this.mpdc.sendCommands(cmds);
	}

	async _socketRequest (msg) {
		const info = await this.mpdc.sendCommand('playlistinfo').then(MPD.parseObject);
		console.log('@mpd.@\n', info)
		return info ? (info.title ? info.title : 'NYET') : '?-?-?';
	}

	_broadcastTrack () {
		this._sendCommand('playlistinfo')
		.then((resp) => {
			console.log('@mpd@\n', resp);
			const info = MPD.parseObject(resp);
			if (info && info.title) {
				this._broadcast({state: this.mstatus.state, track: info.title});
			}
		});
	}

	_broadcastState () {
		this._broadcast({state: this.mstatus.state});
	}

	_broadcast (msg) {
		this.ws.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(msg));
			}
		});
	}

}