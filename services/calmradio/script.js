'use strict';

(function(Calm) {

	Calm.back = (evt) => {
		console.log(evt);
		Calm.nav(evt, evt.target);
	};

	Calm.nav = (evt, elm) => {
		evt.preventDefault();
		let bobj = elm.closest('[data-url]').dataset.url;
		const parms = {act:'calm', what: 'home', bobj: bobj};
		postAction(null, parms, (data) => {
			let el = document.getElementById('calm');
			el.innerHTML = data;
			let bt = elm.closest('a').innerHTML;
			el = document.getElementById('radcrumbs');
			if (el.innerHTML) el.innerHTML += '::';
			el.innerHTML += '<a href="#" data-bobj="'+bobj+'">'+bt+'</a>';
		}, 1);
	};

	Calm.play = (evt) => {
		console.log(evt);
		let elm = evt.target;
		let elmwurl = elm.closest('[data-url]');
		if (elmwurl.parentElement.className=='calm-link') {
			Calm.nav(evt, elm);
			return;
		}
		evt.preventDefault();
		let bobj = elmwurl.dataset.url;
		let how = elm.nodeName=='IMG' ? 'lplay' : 'play';
		const parms = {act:'calm', what: how, bobj: bobj};
		postAction(null, parms, (data) => {
			console.log(data);
			displayCurrent('Calm Radio: '+elmwurl.parentElement.querySelector('a').innerHTML);
			if (data) {
				showLocalAudio(true);
				const laudio = document.getElementById('localaudio');
				laudio.src = data;
				laudio.play();
			}
		}, 1);
	};

	Calm.user = () => {
		const parms = {act:'calm', what: 'user'};
		postAction(null, parms, (data) => {
			let elm = document.getElementById('calm_user');
			elm.innerHTML = data;
			document.getElementById('calm-user-dialog').showModal();
		}, 1);
	};

	Calm.login = (evt,elm) => {
		console.log(evt);
		let frm = evt.target.form;
		const parms = {act:'calm', what: 'login', bobj:{user:frm.user.value, pass:frm.pass.value}};
		postAction(null, parms, (data) => {
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
		postAction(null, parms, (data) => {
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
		postAction(null, parms, (data) => {
			let elm = document.getElementById('calm');
			elm.innerHTML = data;
		}, 1);
	};

})(window.Calm = window.Calm || {});