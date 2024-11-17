'use strict';
const MPD = require('mpd2');
const mpdConnOpts = {path: '/run/mpd/socket'};

module.exports = class MyMPD {

	constructor (mpdc, status, full=false) {
		this.mpdc = mpdc;
		this.mstatus = status;
		if (full) {
			this.mpdc.on('system-player', (a,b) => {
				console.log('on system player event ',a,b)
			});
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
		console.log('status::',this.mstatus);
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
		console.log('status');
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

}