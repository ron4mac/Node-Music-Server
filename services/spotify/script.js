'use strict';

(function(Spot) {

	const sr = 'sp';	// service route

	document.addEventListener('playctl', (e) => {
		console.log('playctl', e.detail);
		const parms = {what: 'playctl', bobj: e.detail};
		postAction(sr, parms, (data) => {
			if (data) alert(data);
		}, 1);
	});

	const reflectPlayer = () => {
		postAction(sr, {what:'state'}, (data) => {
			console.log(data);
		}, 2);
	};

	const startPlay = (how, url) => {
		const parms = {what: how, bobj: url};
		postAction(sr, parms, (data) => {
			displayCurrent(currentStream);
			reflectPlayer();
			if (data) {
				showLocalAudio('cr');
				laudioelm.src = data;
				laudioelm.play();
			}
		}, 1);
	}

	Spot.back = (evt) => {
		console.log(evt);
		Spot.nav(evt, evt.target);
	};

	Spot.nav = (evt, mnu='') => {
		evt.preventDefault();
		console.log(evt);
		let parms;
		if (mnu) {
			parms = {what: 'nav', bobj: mnu};
		} else {
			const telm = evt.target;
			const tnn = telm.nodeName;
			if (!['A','IMG'].includes(tnn)) return;
			if (tnn=='A') {
				if (telm.dataset.next) {
					parms = {what: 'next', bobj: telm.dataset.next};
				} else {
					parms = {what: 'nav', bobj: telm.closest('[data-url]').dataset.url};
				}
			} else {
				parms = {what: 'play', bobj: telm.closest('[data-uri]').dataset.uri};
			}
		}
		postAction(sr, parms, (data) => {
			if (!data) return;
			let el = document.getElementById('spotify');
			el.innerHTML = data;
		}, 1);
	};

	Spot.play = (evt) => {
		console.log(evt);
		evt.preventDefault();
		let elm = evt.target;
		let elmwurl = elm.closest('[data-url]');
		if (elmwurl.className=='spot-link') {
			Spot.nav(evt, elm);
			return;
		}
		evt.preventDefault();
		let url = elmwurl.dataset.url;
		let how = elm.nodeName=='I' ? 'lplay' : 'play';
		currentStream = 'Spotify: '+elmwurl.parentElement.querySelector('a').innerHTML;
		startPlay(how, url);
		// save now playing info for favorites generation
		nowPlaying = {name: currentStream, what:'Spot', how: how, url: url};
	};

	Spot.fave = (how, url) => {
		startPlay(how, url);
	}

	Spot.user = () => {
		const parms = {what: 'user'};
		postAction(sr, parms, (data) => {
		if (data.startsWith('http')) {
			window.location = data;
		} else {
			let elm = document.getElementById('spot_user');
			elm.innerHTML = data;
			document.getElementById('spot-creds').showModal();
		}
		}, 1);
	};

	Spot.creds = (evt,elm) => {
		console.log(evt);
		let frm = evt.target.form;
		const parms = {what: 'creds', bobj:{id:frm.clientId.value, secret:frm.clientSecret.value, rdir:frm.redirect.value}};
		postAction(sr, parms, (data) => {
			if (data.startsWith('http')) {
				window.location = data;
			} else {
				if (data) {
					alert(data);
				} else {
					frm.closest('dialog').close();
				}
			}
		}, 1);
	};

	Spot.logout = (evt,elm) => {
		console.log(evt);
		if (!confirm('Are you sure you want to logout?')) return;
		const parms = {what: 'logout'};
		postAction(sr, parms, (data) => {
			if (data) {
				alert(data);
			} else {
				Spot.get();
				elm.closest('dialog').close();
			}
		}, 1);
	};

	Spot.doSearch = (evt) => {
		console.log(evt);
		evt.preventDefault();
		const vals = getFormValues(evt.target.form);
		if (!vals['sterm']) {alert('Please specify a search term');return;}
		if (!vals['types[]']) {alert('Please specify search scope(s)');return;}
		postAction(sr, {what:'search',bobj:vals}, (data) => {
			let elm = document.getElementById('spotify');
			elm.innerHTML = data;
			evt.target.closest('dialog').close();
		}, 1);
	}

	Spot.search = (evt) => {
		const dlg = document.getElementById('spot-search');
		dlg.showModal();
	}

	Spot.get = () => {
		const parms = {what: 'home'};
		postAction(sr, parms, (data) => {
			let elm = document.getElementById('spotify');
			elm.innerHTML = data;
		}, 1);
	};

})(window.Spot = window.Spot || {});