'use strict';
const http = require('http');
const https = require('https');
const { XMLParser } = require('fast-xml-parser');
//const mpd22 = require('mpd2');

const baseUrl = 'http://opml.radiotime.com/';
const mpdConnOpts = {path: '/run/mpd/socket'};

module.exports = class TuneIn {

	constructor (mympd) {
		this.mpdc = mympd;
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
		//	if (!this.mpdc) {
		//		let mop = mpdConnOpts;
		//		//mop = {port:6600, host: 'localhost'};
		//		this.mpdc = await mpd22.connect(mop);
		//	}

		//	this.mpdc.on('close', () => console.log('client connection closed'));
		//	this.mpdc.on('system', name => console.log('on system event: %s', name));
		//	this.mpdc.on('system-player', (a,b) => console.log('on system player event',a,b));

		//	console.log('get mpd status');
		//	const status = await this.mpdc.sendCommand('status').then(mpd22.parseObject)
		//	console.log(status)

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

/*
	async clear () {
		try {
			if (!this.mpdc) {
				let mop = mpdConnOpts;
				//mop = {port:6600, host: 'localhost'};
				this.mpdc = await mpd22.connect(mop);
			}
			const r0 = await this.mpdc.sendCommand('clear');
		} catch (error) {
			console.error(error);
		}
	}
*/

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

	_connect 
};