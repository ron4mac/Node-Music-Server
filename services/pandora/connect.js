'use strict'

const http = require('http');
const https = require('https');
const querystring = require('querystring');
const _ = require('underscore');
const crypto = require('crypto');
const iOSpartnerInfo = {
		username: 'iphone',
		password: 'P2E4FC0EAD3*878N92B2CDp34I0B1@388137C',
		deviceModel: 'IP01',
		decryptPassword: '20zE1E47BE57$51',
		encryptPassword: '721^26xE22776',
		version: '5'
	};

module.exports = class Connect {

	static hostname = 'ios-tuner.pandora.com';
	static path = '/services/json/';

	constructor (username, password) {
	//	this.username = username;
	//	this.password = password;
		this.partnerInfo = iOSpartnerInfo;
		this.authData = null;
		this.cryptiv = new Buffer.alloc(0);
	}

	login (username, password, callback) {
		this._partnerLogin(this.partnerInfo, (err, partner) => {
			if (err) return callback(err);
		//	this._userLogin(this.partnerInfo.encryptPassword, partner, this.username, this.password, (err, user) => {
			this._userLogin(this.partnerInfo.encryptPassword, partner, username, password, (err, user) => {
				if (err) return callback(err);
				console.log(user);
				this.authData = {
					username: username,
					userAuthToken: user.userAuthToken,
					partnerId: partner.partnerId,
					userId: user.userId,
					syncTimeOffset: partner.syncTimeOffset,
					timeoutMinutes: user.listeningTimeoutMinutes,
					startTime: Date.now()
				};
				callback(null);
			});
		});
	}

	request (method, data, callback) {
		if (typeof data === 'function' && callback == null) {
			callback = data;
			data = {};
		}

		if (this.authData == null) {
			return callback(new Error('Not authenticated with Pandora (call login() before request())'));
		}

		let secure = false;
		if (method === 'station.getPlaylist') secure = true;
		let body = _.extend(data, {
			userAuthToken: this.authData.userAuthToken,
			syncTime: this.authData.syncTimeOffset + this._seconds()
		});
		let encryptedBody = this._encrypt(this.partnerInfo.encryptPassword, JSON.stringify(body)).toString('hex').toLowerCase();
		if (method === 'test.checkLicensing') encryptedBody = null;
		this._fetch({
			qs: {
				method: method,
				auth_token: this.authData.userAuthToken,
				partner_id: this.authData.partnerId,
				user_id: this.authData.userId
			},
			body: encryptedBody,
			secure: secure
		}, this._unwrap(callback));
	}


	/* all private below here */

	_seconds () {
		return Date.now() / 1000 | 0;
	}

	_unwrap (callback) {
		return (err, res, body) => {
			if (err) return callback(err);
			let parsed = body;
			if (typeof parsed === 'string') {
				parsed = JSON.parse(body);
			}
			if (parsed.stat === 'fail') {
				return callback(new Error(parsed.message + ' [' + parsed.code + ']'));
			} else if (parsed.stat === 'ok') {
				return callback(null, parsed.result);
			} else {
				return callback(new Error('Unknown error'));
			}
		};
	}

	_decryptSyncTime (password, ciphered) {
		return parseInt(this._decrypt(password, ciphered).toString('utf8', 4, 14), 10);
	}

	_partnerLogin (partnerInfo, callback) {
		this._fetch({
			qs: {method: 'auth.partnerLogin'},
			body: JSON.stringify(_.omit(partnerInfo, ['decryptPassword', 'encryptPassword'])),
			secure: true
		}, this._unwrap((err, result) => {
			if (err) return callback(err);
			result.syncTimeOffset = this._decryptSyncTime(partnerInfo.decryptPassword, result.syncTime) - this._seconds();
			callback(null, result);
		}));
	}

	_userLogin (encryptPassword, partnerData, username, password, callback) {
		this._fetch({
			qs: {
				method: 'auth.userLogin',
				auth_token: partnerData.partnerAuthToken,
				partner_id: partnerData.partnerId
			},
			body: this._encrypt(encryptPassword, JSON.stringify({
				loginType: 'user',
				username: username,
				password: password,
				partnerAuthToken: partnerData.partnerAuthToken,
			//	syncTime: partnerData.syncTimeOffset + this._seconds()
				syncTime: this._seconds()
			})).toString('hex').toLowerCase()
		}, this._unwrap(callback));
	}

	_fetch (options, callback) {
		options.hostname = Connect.hostname;
		let urlpath = querystring.encode(options.qs);
		options.path = Connect.path + (urlpath ? ('?'+urlpath) : '');
		options.method = 'post';
//		if (options.secure) {		// @@@@@ should always be secure, I guess
			this._reqHttps(options, callback)
//		} else {
//			this._reqHttp(options, callback)
//		}
	}

	_reqHttp (options, callback) {
		//console.log(options);
		const req = http.request(options, (res) => {
			let data='';
			res.setEncoding('utf8');
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => { callback(null, res, data); });
		});
		req.on('error', (e) => { console.error(`problem with request: ${e.message}`); });

		// Write any data to request body
		if (options.body) req.write(options.body);

		req.end();
	}

	_reqHttps (options, callback) {
		//console.log(options);
		const req = https.request(options, (res) => {
			let data='';
			res.setEncoding('utf8');
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => { callback(null, res, data); });
		});
		req.on('error', (e) => { console.error(`problem with request: ${e.message}`); });

		// Write any data to request body
		if (options.body) req.write(options.body);

		req.end();
	}


	// CRYPTOGRAPHY STUFF

	_decrypt (password, ciphered) {
		const blowfish = this._createDecryptor(password);
		return blowfish(new Buffer.from(ciphered, 'hex'));
	}

	_encrypt (password, plain) {
		const blowfish = this._createCryptor(password);
		return blowfish(plain);
	}

	_createCryptor (key) {
		const PADDING_LENGTH = 16;
		const PADDING = Array(PADDING_LENGTH).join("\0");
		key = new Buffer.from(key);
		return (data) => {
			let cipher = crypto.createCipheriv('bf-ecb', key, this.cryptiv);
			cipher.setAutoPadding(false);
			let padLength = PADDING_LENGTH - (data.length % PADDING_LENGTH);
			if (padLength === PADDING_LENGTH) {
				padLength = 0;
			}
			try {
				return Buffer.concat([
					cipher.update(data + PADDING.substr(0, padLength)),
					cipher.final()
				]);
			} catch (e) {
				return null;
			}
		};
	}

	_createDecryptor (key) {
		key = new Buffer.from(key);
		return (data) => {
			let cipher = crypto.createDecipheriv('bf-ecb', key, this.cryptiv);
			cipher.setAutoPadding(false);
			try {
				return Buffer.concat([
					cipher.update(data),
					cipher.final()
				]);
			} catch (e) {
				return null;
			}
		};
	}


};