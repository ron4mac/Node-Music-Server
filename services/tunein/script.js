'use strict';

class TuneinClass {

	sr = 'ti';	// service route
	last = '';

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
		const bobj = elm.closest('[data-url]').dataset.url;
		const parms = {act:'radio', what: 'home', bobj: bobj};
		postAction(this.sr, parms, (data) => {
			if (!data) {
				my.alert('No Returned Data');
				return;
			}
			let el = document.getElementById('radio');
			el.innerHTML = data;
			const bt = elm.closest('a').innerHTML;
			el = document.getElementById('radcrumbs');
			if (el.innerHTML) el.innerHTML += '::';
			el.innerHTML += '<a href="#" data-bobj="'+bobj+'">'+bt+'</a>';
		}, 1);
	}

	back (evt) {
		//console.log(evt);
		evt.preventDefault();
		if (evt.target.nodeName != 'A') return;
		const bobj = evt.target.dataset.bobj;
		const parms = {act:'radio', what: 'home', bobj: bobj};
		postAction(this.sr, parms, (data) => {
			const el = document.getElementById('radio');
			el.innerHTML = data;
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


	#startPlay (how, url) {
		const parms = {act:'radio', what: how, bobj: url};
		postAction(this.sr, parms, (data) => {
			displayCurrent(currentStream);
			if (data) {
				showLocalAudio(this.sr);
				laudioelm.src = data;
				laudioelm.play();
			}
		}, 1);
	}

}
// instantiate it
var Tunein = new TuneinClass();
