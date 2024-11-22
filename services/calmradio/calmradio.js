'use strict';
const cntrlr = require('../../controller');
const https = require('https');
//const fs = require('fs');

const CRURLS = {
		metadata: 'https://api.calmradio.com/v2/metadata.json',
		categories: 'https://api.calmradio.com/v2/metadata.json',
		channels2: 'https://api.calmradio.com/v2/channels.json',
		channels: 'https://api.calmradio.com/v2/channels.json',
		arts: 'https://arts.calmradio.com',
		token: 'https://api.calmradio.com/get_token',
		check2: 'https://api.calmradio.com/v2/check',
		check: 'https://api.calmradio.com/check'
	};

module.exports = class CalmRadio {

	constructor (mympd) {
		this.mpdc = mympd;
		this.authenticated = true;
		this.userToken = cntrlr.getSetting('calmradio_token', '');
	}

	action (what, bobj, resp) {
		switch (what) {
		case 'user':
			const htm = this.userToken ? 'user.html': 'login.html';
			resp.write(cntrlr.readFile('services/calmradio/'+htm, 'FAILED TO READ'));
			resp.end();
			break;
		case 'home':
			const b = (bobj!=='undefined') ? bobj : '';
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
		console.log('browseSurl',surl);
		this._getMetaData()
		.then(() => {
			if (surl) {
				const [gn,cn] = surl.split('.');
				if (cn) {
					this._getChanData()
					.then(() => {
						this._displayCategory(cn, resp);
					});
				} else {
					this._displayCategories(gn, resp);
				}
			} else {
				this._displayGroups(resp);
			}
		//	resp.end();
		});
	}

	play (which, resp) {
		this._getChanData()
		.then(() => {
			const chan = this.chns[which];
			const stream = chan.free[0].streams[128];	console.log(stream);
			try {
				this.mpdc.sendCommand('clear');
				this.mpdc.sendCommand('add '+stream);
				this.mpdc.sendCommand('play');
			} catch (error) {
				console.error(error);
			}
		});
		resp.end();
	}

	/* PRIVATE METHODS BELOW HERE */

	_displayGroups (resp) {
		for (const id in this.grps) {
			const g = this.grps[id];
			const art = g.art ? CRURLS.arts+g.art : '/services/calmradio/calmradioicon.png';
			resp.write('<div class="calm-link"><img src="'+art+'"><a href="#'+g.id+'" data-url="'+g.id+'">'+g.title+'</a></div>');
		}
		resp.end();
	}

	_displayCategories (which, resp) {
		const cats = this.grps[which].cats;
		cats.forEach((cn) => {
			const g = this.cats[cn];
			resp.write('<div class="calm-link"><img src="'+CRURLS.arts+g.img+'"><a href="#.'+g.id+'" data-url=".'+g.id+'">'+g.title+'</a></div>');
		});
		resp.end();
	}

	_displayCategory (which, resp) {
		const chs = this.cats[which].channels;
		chs.forEach((c) => {
			const g = this.chns[c];
			if (!this.logged && !g.free[0]) {
				resp.write('<div class="calm-noplay"><img src="'+CRURLS.arts+g.img+'" class="noplay"><span>'+g.title+'</span></div>');
			} else {
				resp.write('<div class="calm-play"><img src="'+CRURLS.arts+g.img+'"><a href="#..'+c+'" data-url="'+c+'">'+g.title+'</a></div>');
			}
		});
		resp.end();
	}

	_camel (string) {
		return string.toLowerCase().split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
	}

	_parseMetadata (data) {
		let rows = {};
		let cats = {}
		for (let row of data.metadata.rows) {
			let arow = []
			arow['id'] = row.id
			arow['title'] = this._camel(row['title'])
			arow['cats'] = row['categories'] || [row['category']]
			arow['art'] = row['background_art_url']
			rows[row['id']] = arow
		}
		for (let cat of data.metadata.categories) {
			let acat = []
			acat['id'] = cat.id
			acat['title'] = this._camel(cat['title'])
			acat['img'] = cat['square_art_url'] || cat['tiny_square_art_url'] || cat['hd_square_art_url'] || cat['background_art_url']
			acat['channels'] = cat['channels']
			cats[cat['id']] = acat
		}
		//console.log(cats);
		return {rows: rows, cats: cats}
	}

	_parseChannels (data) {
		let chns = []
		for (let chn of data.channels) {
			let achn = []
			achn['title'] = this._camel(chn['title'])
			achn['desc'] = chn['md_description'] || chn['description']
			achn['img'] = chn['tiny_square_art_url'] || chn['square_art_url'] || chn['hd_square_art_url']
			achn['story'] = chn['story']
			achn['cat'] = chn['category'] || 999
			achn['vip'] = chn['vip']
			achn['free'] = chn['free']
			chns[chn['id']] = achn
		}
		return chns
	}

	_getMetaData () {
		return new Promise((resolve, reject) => {
			if (this.grps) resolve();
			try {
				let dat = '';
				https.get(CRURLS.categories, (r) => {
					r.on('data', (chunk) => {
						dat += chunk;
					}).on('end', () => {
						const parsed = this._parseMetadata(JSON.parse(dat));
						this.grps = parsed.rows;
						this.cats = parsed.cats;
						resolve();
					});
				}).end();
			} catch (error) {
				reject(error);
			}
		});
	}

	_getChanData () {
		return new Promise((resolve, reject) => {
			if (this.chns) resolve();
			try {
				let dat = '';
				https.get(CRURLS.channels, (r) => {
					r.on('data', (chunk) => {
						dat += chunk;
					}).on('end', () => {
						this.chns = this._parseChannels(JSON.parse(dat));
						resolve();
					});
				}).end();
			} catch (error) {
				reject(error);
			}
		});
	}


}