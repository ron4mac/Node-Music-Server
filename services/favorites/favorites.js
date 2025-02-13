'use strict';
import cntrlr from '../../lib/controller.js';

export default class Favorites {

	constructor (mympd) {
		this.mpdc = mympd;
		this.faves = [];
	}

	action (what, bobj, resp) {
		switch (what) {
		case 'home':
			this.faves = JSON.parse(cntrlr.readFile('favorites.json', '[]'));
			if (this.faves.length) {
				this.faves.forEach((fave, index) => {
					resp.write(`<div class="${fave.how}" data-fid="${index}">`);
					resp.write(`<i class="fa fa-bars" aria-hidden="true" onclick="Favorites.more(event)"></i>`);
					resp.write(`<a href="#F${index}">${fave.name}</a></div>`);
				});
				resp.end();
			} else {
				resp.end('THERE ARE NO FAVORITES YET');
			}
			break;
		case 'add':
			this.#add(bobj /*{...{what: bobj}, ...cntrlr.currentPlaying}*/, resp);
			break;
		case 'delete':
			//console.log('delete',bobj);
			resp.end();
			this.#delete(bobj, resp);
			break;
		case 'play':
			resp.end(JSON.stringify(this.faves[bobj]));
			break;
		case 'playd':
			this.#startFave(bobj);
			resp.end();
			break;
		case 'lplayd':
			resp.end(bobj);
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

	#add (fave, resp) {
		this.faves.push(fave);
		let rslt = cntrlr.writeFile('favorites.json', JSON.stringify(this.faves, null, "\t"));
		resp.end(rslt ? ('Error: '+rslt) : 'Added to favorites');
	}

	#delete (fave, resp) {
		this.faves.splice(fave,1);
		let rslt = cntrlr.writeFile('favorites.json', JSON.stringify(this.faves, null, "\t"));
		resp.end();
	}

	#startFave (surl) {
		try {
			this.mpdc.sendCommand('clear');
			this.mpdc.sendCommand('add '+surl);
			this.mpdc.sendCommand('play');
		} catch (error) {
			console.error(error);
		}
	}
/*
	play (url, resp) {
		this.#startFave(url);
		resp.end();
		return;
		let dat = '';
		http.get(url, (r) => {
			r.on('data', (chunk) => {
				dat += chunk;
			}).on('end', () => {
				// drove me CRAZY discovering that linefeeds at the end caused things to hang!
				let surl = dat.replace(/[\r\n]+/gm, '');
				this.#startFave(surl);
				resp.end();
			});
		}).end();
	}

	lplay (url, resp) {
		resp.end(url);
		return;

		let dat = '';
		http.get(url, (r) => {
			r.on('data', (chunk) => {
				dat += chunk;
			}).on('end', () => {
				// drove me CRAZY discovering that linefeeds at the end caused things to hang!
				let surl = dat.replace(/[\r\n]+/gm, '');
				//this.#startFave(surl);
				resp.end(surl);
			});
		}).end();
	}
*/

};
