'use strict';

class TuneinClass {

	sr = 'ti';	// service route
	last = '';
	stats = null;
	crumbs = ['<a href="#" data-bobj="" data-ix="0">Home</a>'];

	play (evt) {
		const elm = evt.target;
		if (!['A','I'].includes(elm.nodeName)) return;
		const elmwurl = elm.closest('[data-url]');
		if (elmwurl.parentElement.classList.contains('rad-link')) {
			this.nav(evt, elm);
			return;
		}
		evt.preventDefault();
		const url = elmwurl.dataset.url;
		const how = elm.nodeName=='I' ? 'lplay' : 'play';
		currentStream = 'Radio: '+elmwurl.querySelector('a').innerHTML;
		this.#startPlay(how, url);
		nowPlaying = {name: currentStream, what:'Tunein', how: how, url: url};
	}

	fave (how, url) {
		//console.log(how, url);
		this.#startPlay(how, url);
	}

	nav (evt, elm) {
		evt.preventDefault();
		let bobj = elm.closest('[data-url]').dataset.url;
		const parms = {act:'radio', what: 'home', bobj: bobj};
		postAction(this.sr, parms, (data) => {
			if (!data) {
				my.alert('!No Returned Data');
				return;
			}
			let el = document.getElementById('radio');
			el.innerHTML = data;
			const bt = elm.closest('a').innerHTML;
			this.crumbs.push('<a href="#" data-bobj="'+bobj+'" data-ix="'+this.crumbs.length+'">'+bt+'</a>');
			this.#showCrumbs();
		}, 1);
	}

	back (evt) {
		//console.log(evt);
		evt.preventDefault();
		if (evt.target.nodeName != 'A') return;
		let cix = +evt.target.dataset.ix;
		const bobj = evt.target.dataset.bobj;
		const parms = {act:'radio', what: 'home', bobj: bobj};
		postAction(this.sr, parms, (data) => {
			const el = document.getElementById('radio');
			el.innerHTML = data;
			this.crumbs = this.crumbs.slice(0,cix+1);
			this.#showCrumbs();
		}, 1);
	}

	search () {
		my.prompt('Search radio stations',this.last,{required:true})
		.then(st=>{
			if (!st) return;
			this.last = st;
			const parms = {act:'radio', what: 'search', bobj: st};
			postAction(this.sr, parms, (data) => {
				let el = document.getElementById('radio');
				el.innerHTML = data;
			}, 1);
		});
	}

	get () {
		const parms = {act:'radio', what: 'home'};
		postAction(this.sr, parms, (data) => {
			const elm = document.getElementById('radio');
			elm.innerHTML = data;
		}, 1);
	}


	#showCrumbs () {
		const el = document.getElementById('radcrumbs');
		el.innerHTML = this.crumbs.join('::');
	}

	#startPlay (how, url) {
		const parms = {act:'radio', what: how, bobj: {url: url, realm: currentStream}};
		postAction(this.sr, parms, (data) => {
			displayCurrent(currentStream);
			if (data) {
				if (data.error) {
					my.alert(data.error,{class:'warn'});
				}
				if (data.url) {
					// clear the current track display
					displayCurrentTrack('');
					// try to get any track metadata
					this.#getAnyMeta(data.url);
					// stop any current audio
					if (laudioelm) {
						laudioelm.pause();
						laudioelm.currentTime = 0;
					}
					// play the local audio
					showLocalAudio(this.sr);
//					laudioelm.src = '';
					laudioelm.src = data.url;
//					laudioelm.play();
				}
			}
		}, 2);
	}

	#getAnyMeta (surl) {
		const stobj = new IcecastMetadataStats(surl, {sources: ['icy','ogg','icestats','stats','nextsongs','sevenhtml']});
		stobj.fetch()
		.then(s=>{
			//console.log(s);
			let src = '';
			if (s.icestats) {
				src = 'icestats';
			} else if (s.ogg) {
				src = 'ogg';
			} else if (s.stats) {
				src = 'stats';
			} else if (s.nextsongs) {
				src = 'nextsongs';
			} else if (s.sevenhtml) {
				src = 'sevenhtml';
			} else if (s.icy) {
				src = 'icy';
			}
			if (src) {
				// clear any current icecasting
				if (this.stats) {
					this.stats.stop();
					this.stats = null;
				}
				this.stats = new IcecastMetadataStats(surl, {onStats: this.#onStats, sources: [src], interval: 8});
				this.stats.start();
			}
		});
	}

	#onStats (stats) {
		let ttl = '';
		//console.log(stats);
		if (stats.icy) {
			ttl = stats.icy.StreamTitle;
		} else if (stats.icestats) {
			ttl = stats.icestats.source.title;
		}
		displayCurrentTrack(ttl);
	}

}
// instantiate it
var Tunein = new TuneinClass();
