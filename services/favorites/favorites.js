'use strict';
const cntrlr = require('../../controller');
//const http = require('http');
//const https = require('https');

module.exports = class Favorites {

	constructor (mympd) {
		this.mpdc = mympd;
		this.faves = [];
	}

	action (what, bobj, resp) {
		switch (what) {
		case 'home':
			this.faves = JSON.parse(cntrlr.readFile('services/favorites/favorites.json', '[]'));
			if (this.faves.length) {
				this.faves.forEach((fave, index) => {
					resp.write(`<div class="${fave.how}" data-fid="${index}">`);
					resp.write(`<i class="fa fa-bars" aria-hidden="true"></i>`);
					resp.write(`<a href="#F${index}">${fave.name}</a></div>`);
				});
				resp.end();
			} else {
				resp.end('THERE ARE NO FAVORITES YET');
			}
			break;
		case 'add':
			this.add(bobj /*{...{what: bobj}, ...cntrlr.currentPlaying}*/, resp);
			break;
		case 'play':
			resp.end(JSON.stringify(this.faves[bobj]));
			break;
		case 'lplay':
			this.lplay(bobj, resp);
			break;
		case 'clear':
			this.mpdc.clear();
			resp.end();
			break;
		case 'load':
			resp.end(cntrlr.readFile('services/favorites/favorites.html', 'FAILED TO READ'));
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

	add (fave, resp) {
		this.faves.push(fave);
		let rslt = cntrlr.writeFile('services/favorites/favorites.json', JSON.stringify(this.faves, null, "\t"));
		resp.end(rslt ? rslt : 'Added to favorites');
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
		resp.end(JSON.stringify(this.faves[url]));
		return;
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


};
