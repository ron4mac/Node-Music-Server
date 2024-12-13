'use strict';

(function(Tunein) {

	const sr = 'ti';	// service route

	const startPlay = (how, url) => {
		const parms = {act:'radio', what: how, bobj: url};
		postAction(sr, parms, (data) => {
			displayCurrent(currentStream);
			if (data) {
				showLocalAudio('ti');
				laudioelm.src = data;
				laudioelm.play();
			}
		}, 1);
	}

	Tunein.play = (evt) => {
		//console.log(evt);
		let elm = evt.target;
		if (!['A','I'].includes(elm.nodeName)) return;
		let elmwurl = elm.closest('[data-url]');
		if (elmwurl.parentElement.className=='rad-link') {
			Tunein.nav(evt, elm);
			return;
		}
		evt.preventDefault();
		let url = elmwurl.dataset.url;
		let how = elm.nodeName=='I' ? 'lplay' : 'play';
		currentStream = 'Radio: '+elmwurl.querySelector('a').innerHTML;
		startPlay(how, url);
		//displayCurrent(currentStream);
		// save now playing info for favorites generation
		nowPlaying = {name: currentStream, what:'Tunein', how: how, url: url};
/*		const parms = {act:'radio', what: how, bobj: bobj};
		postAction(null, parms, (data) => {
			currentStream = 'Radio: '+elmwurl.querySelector('a').innerHTML;
		//	let ptyp = 'remote';
		//	let purl = ':radio:'+bobj;
			displayCurrent(currentStream);
			if (data) {
		//		ptyp = 'local';
		//		purl = data;
		//		console.log(data);
				showLocalAudio(true);
				const laudio = document.getElementById('localaudio');
				laudio.src = data;
				laudio.play();
			}
		}, 1);*/
	};

	Tunein.fave = (how, url) => {
		startPlay(how, url);
	}

	Tunein.nav = (evt, elm) => {
		evt.preventDefault();
		let bobj = elm.closest('[data-url]').dataset.url;
		const parms = {act:'radio', what: 'home', bobj: bobj};
		postAction(sr, parms, (data) => {
			let el = document.getElementById('radio');
			el.innerHTML = data;
			let bt = elm.closest('a').innerHTML;
			el = document.getElementById('radcrumbs');
			if (el.innerHTML) el.innerHTML += '::';
			el.innerHTML += '<a href="#" data-bobj="'+bobj+'">'+bt+'</a>';
		}, 1);
	};

	Tunein.back = (evt) => {
		console.log(evt);
		evt.preventDefault();
		if (evt.target.nodeName != 'A') return;
		let bobj = evt.target.dataset.bobj;
		const parms = {act:'radio', what: 'home', bobj: bobj};
		postAction(sr, parms, (data) => {
			let el = document.getElementById('radio');
			el.innerHTML = data;
		//	let bt = elm.closest('a').innerHTML;
		//	el = document.getElementById('radcrumbs');
		//	if (el.innerHTML) el.innerHTML += '::';
		//	el.innerHTML += '<a href="#" data-bobj="'+bobj+'">'+bt+'</a>';
		}, 1);
	};

	Tunein.search = () => {
		let sterm = prompt('Search radio stations');
		if (sterm) {
			const parms = {act:'radio', what: 'search', bobj: sterm};
			postAction(sr, parms, (data) => {
				let el = document.getElementById('radio');
				el.innerHTML = data;
			//	let bt = elm.closest('a').innerHTML;
			//	el = document.getElementById('radcrumbs');
			//	if (el.innerHTML) el.innerHTML += '::';
			//	el.innerHTML += '<a href="#" data-bobj="'+bobj+'">'+bt+'</a>';
			}, 1);
		}
	};

	Tunein.get = () => {
		const parms = {act:'radio', what: 'home'};
		postAction(sr, parms, (data) => {
			let elm = document.getElementById('radio');
			elm.innerHTML = data;
		}, 1);
	};

})(window.Tunein = window.Tunein || {});
