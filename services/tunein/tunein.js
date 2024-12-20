'use strict';
const cntrlr = require('../../controller');
const http = require('http');
//const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const baseUrl = 'http://opml.radiotime.com/';

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
		case 'load':
			resp.end(cntrlr.readFile('services/tunein/tunein.html', 'FAILED TO READ'));
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
				console.log(jdat);
				if (Array.isArray(jdat.opml.body.outline)) {
					this.#radioParse(jdat.opml.body.outline, resp);
				} else if (jdat.opml.body.outline) {
					this.#radioParse([jdat.opml.body.outline], resp);
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
					this.#radioParse(jdat.opml.body.outline, resp);
				} else {
					this.#radioParse([jdat.opml.body.outline], resp);
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
			//	cntrlr.currentPlaying = {lr: 'remote', f:'webRadio', a:'play', p:url};
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
			//	cntrlr.currentPlaying = {lr: 'local', f:'webRadio', a:'lplay', p:url};
				resp.end(surl);
			});
		}).end();
	}

// @@@@@ private methods
	#radioParse (data, resp) {
		//console.log(data);
		if (!Array.isArray(data)) {
			//console.log(data);
			data = data.outline;
		}
		//console.log(data);
		for (let itm of data) {
			if (itm.outline) {
				if (Array.isArray(itm.outline)) {
					resp.write('<div class="rad-section"><div class="rheader">'+itm.text+'</div>');
					this.#radioParse(itm.outline, resp);
					resp.write('</div>');
					continue;
				} else {
					itm = itm.outline;
				}
			}
			let txt = itm.text??'';
			if (itm.type) {
				switch (itm.type) {
				case 'link':
					//if (itm.key) console.log(itm);
					txt += (itm.subtext ? (' - ' + itm.subtext) : '');
					let urlsuf = itm.URL.split('/').pop();
					let aid = itm.guide_id??itm.key;
					let xc = (itm.key && itm.key.startsWith('next')) ? ' next' : '';
					resp.write('<div class="rad-link'+xc+'"><a href="#'+aid+'" data-url="'+btoa(urlsuf)+'">'+txt+'</a></div>');
				//	if (itm.children) webRadioParse(itm.children, resp);
					break;
				case 'audio':
					resp.write('<div class="rad-station" data-url="'+itm.URL+'"><img src="'+itm.image+'">');
					resp.write('<a href="#'+itm.guide_id+'">'+txt+'</a> <i class="fa fa-headphones lplay"></i></div>');
				//	resp.write('<div class="rad-station">'+txt+'</div>');
					break;
				case 'text':
					resp.write('<div class="notice">'+txt+'</div>');
					break;
				}
			} else {
				resp.write('<div class="chancat">'+txt+'</div>');
			//	if (itm.children) webRadioParse(itm.children, resp);
			}
		}
	}


};
