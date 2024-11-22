'use strict';
const http = require('http');
const https = require('https');
const { XMLParser } = require('fast-xml-parser');
const WebSocket = require('ws');

const baseUrl = 'http://opml.radiotime.com/';

module.exports = class TuneIn {

	constructor (mympd) {
		this.mpdc = mympd;
//		this.ws = new WebSocket.Server({port:6682});
//		this.ws.on('connection', (sc) => {
//			sc.on('error', console.error);
//			sc.on('message', (data) => {
//				console.log('received: %s', data);
//				this._socketRequest(data)
//				.then(reply => sc.send(reply));
//			});
//		});
//		this._streamSocket();
	}

	action (what, bobj, resp) {
		switch (what) {
		case 'home':
			let b = (bobj!=='undefined') ? atob(bobj) : '';
			this.browse(b, resp);
			break;
		case 'search':
			this.search(bobj, resp);
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
		}
	}

	browse (surl, resp) {
		let dat = '';
		http.get(baseUrl+surl, (r) => {
			r.on('data', (chunk) => {
				dat += chunk;
			}).on('end', () => {
				const parser = new XMLParser({ignoreAttributes: false, attributeNamePrefix: ''});
				const jdat = parser.parse(dat);
				if (Array.isArray(jdat.opml.body.outline)) {
					this._radioParse(jdat.opml.body.outline, resp);
				} else {
					this._radioParse([jdat.opml.body.outline], resp);
				}
				//}
				resp.end()
			});
		}).end();
	}

	search (sexp, resp) {
		let dat = '';
		http.get(baseUrl+'Search.ashx?query='+encodeURIComponent(sexp), (r) => {
			r.on('data', (chunk) => {
				dat += chunk;
			}).on('end', () => {
				const parser = new XMLParser({ignoreAttributes: false, attributeNamePrefix: ''});
				const jdat = parser.parse(dat);
				if (Array.isArray(jdat.opml.body.outline)) {
					this._radioParse(jdat.opml.body.outline, resp);
				} else {
					this._radioParse([jdat.opml.body.outline], resp);
				}
				//}
				resp.end()
			});
		}).end();
	}

	startRadio (surl) {
		try {
			this.mpdc.sendCommand('clear');
			this.mpdc.sendCommand('add '+surl);
			this.mpdc.sendCommand('play');
		} catch (error) {
			console.error(error);
		}
	}

	play (url, resp) {
		let dat = '';
		http.get(url, (r) => {
			r.on('data', (chunk) => {
				dat += chunk;
			}).on('end', () => {
				// drove me CRAZY discovering that linefeeds at the end caused things to hang!
				let surl = dat.replace(/[\r\n]+/gm, '');
				this.startRadio(surl);
				resp.end();
			});
		}).end();
	}

	lplay (url, resp) {
		let dat = '';
		http.get(url, (r) => {
			r.on('data', (chunk) => {
				dat += chunk;
			}).on('end', () => {
				// drove me CRAZY discovering that linefeeds at the end caused things to hang!
				let surl = dat.replace(/[\r\n]+/gm, '');
				//this.startRadio(surl);
				resp.end(surl);
			});
		}).end();
	}

// @@@@@ private methods
	_radioParse (data, resp) {
		if (!Array.isArray(data)) {
		//	console.log(data);
			data = data.outline;
		}
		for (let itm of data) {
			if (itm.outline) {
				if (Array.isArray(itm.outline)) {
					resp.write('<div class="rheader">'+itm.text+'</div>');
					this._radioParse(itm.outline, resp);
					continue;
				} else {
					itm = itm.outline;
				}
			}
			let txt = itm.text??'' + ' .. ' + itm.subtext??'';
			if (itm.type) {
				switch (itm.type) {
				case 'link':
					let urlsuf = itm.URL.split('/').pop();
					let aid = itm.guide_id??itm.key;
					resp.write('<div class="rad-link"><a href="#'+aid+'" data-url="'+btoa(urlsuf)+'">'+txt+'</a></div>');
					if (itm.children) webRadioParse(itm.children, resp);
					break;
				case 'audio':
					resp.write('<div class="rad-station" data-url="'+itm.URL+'"><img src="'+itm.image+'"><a href="#'+itm.guide_id+'">'+txt+'</a></div>');
				//	resp.write('<div class="rad-station">'+txt+'</div>');
					break;
				case 'text':
					resp.write('<div class="notice">'+txt+'</div>');
					break;
				}
			} else {
				resp.write('<div class="chancat">'+txt+'</div>');
				if (itm.children) webRadioParse(itm.children, resp);
			}
		}
	}

/*
	_sendWebClients (data) {
		this.ws.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(data);
			}
		});
	}

	async _socketRequest (msg) {
		this.mpdc.sendCommand('playlistinfo')
		.then((resp) => {
			console.log('@tunein@\n', resp);
			const info = this.mpdc.parseData(resp);
			return info ? info.title : '?-?-?';
		});
	}

	_streamSocket () {
		this.mpdc.mpdc.on('system', name => {
			console.log('system stream event ', name);
			if (name=='playlist') {
				this.mpdc.sendCommand('playlistinfo')
				.then((resp) => {
					console.log('@tunein@\n', resp);
					const info = this.mpdc.parseData(resp);
					if (info) this._sendWebClients(info.title);
				});
			}
		});
	}
*/

};
