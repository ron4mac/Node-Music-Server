'use strict';

(function(Calm) {

	const sr = 'cr';	// service route

	const startPlay = (how, url) => {
		const parms = {act:'calm', what: how, bobj: url};
		postAction(sr, parms, (data) => {
			displayCurrent(currentStream);
			if (data) {
				showLocalAudio(true);
				const laudio = document.getElementById('localaudio');
				laudio.src = data;
				laudio.play();
			}
		}, 1);
	}

	Calm.back = (evt) => {
		console.log(evt);
		Calm.nav(evt, evt.target);
	};

	Calm.nav = (evt, elm) => {
		evt.preventDefault();
		let bobj = elm.closest('[data-url]').dataset.url;
		const parms = {act:'calm', what: 'home', bobj: bobj};
		postAction(sr, parms, (data) => {
			let el = document.getElementById('calm');
			el.innerHTML = data;
			//let bt = elm.closest('a').innerHTML;
			//el = document.getElementById('radcrumbs');
			//if (el.innerHTML) el.innerHTML += '::';
			//el.innerHTML += '<a href="#" data-bobj="'+bobj+'">'+bt+'</a>';
		}, 1);
	};

	Calm.play = (evt) => {
		console.log(evt);
		evt.preventDefault();
		let elm = evt.target;
		let elmwurl = elm.closest('[data-url]');
		if (elmwurl.parentElement.className=='calm-link') {
			Calm.nav(evt, elm);
			return;
		}
		evt.preventDefault();
		let url = elmwurl.dataset.url;
		let how = elm.nodeName=='IMG' ? 'lplay' : 'play';
		currentStream = 'Calm Radio: '+elmwurl.parentElement.querySelector('a').innerHTML;
		startPlay(how, url);
		//const parms = {act:'calm', what: how, bobj: bobj};
		//postAction(null, parms, (data) => {
		//	console.log(data);
		//	displayCurrent(currentStream);
		//	if (data) {
		//		showLocalAudio(true);
		//		const laudio = document.getElementById('localaudio');
		//		laudio.src = data;
		//		laudio.play();
		//	}
		//}, 1);
		// save now playing info for favorites generation
		nowPlaying = {name: currentStream, what:'Calm', how: how, url: url};

	};

	Calm.fave = (how, url) => {
		startPlay(how, url);
	}

	Calm.user = () => {
		const parms = {act:'calm', what: 'user'};
		postAction(sr, parms, (data) => {
			let elm = document.getElementById('calm_user');
			elm.innerHTML = data;
			document.getElementById('calm-user-dialog').showModal();
		}, 1);
	};

	Calm.login = (evt,elm) => {
		console.log(evt);
		let frm = evt.target.form;
		const parms = {act:'calm', what: 'login', bobj:{user:frm.user.value, pass:frm.pass.value}};
		postAction(sr, parms, (data) => {
			if (data) {
				alert(data);
			} else {
				elm.closest('dialog').close();
				Calm.get();
			}
		}, 1);
	};

	Calm.logout = (evt,elm) => {
		console.log(evt);
		if (!confirm('Are you sure you want to logout?')) return;
		const parms = {act:'calm', what: 'logout'};
		postAction(sr, parms, (data) => {
			if (data) {
				alert(data);
			} else {
				Calm.get();
				elm.closest('dialog').close();
			}
		}, 1);
	};

	Calm.get = () => {
		const parms = {act:'calm', what: 'home'};
		postAction(sr, parms, (data) => {
			let elm = document.getElementById('calm');
			elm.innerHTML = data;
		}, 1);
	};

})(window.Calm = window.Calm || {});