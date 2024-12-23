'use strict';
/*global my*/
class CalmClass {

	sr = 'cr';	// service route

	constructor () {
		this.pdiv = document.getElementById('calm');
	}

	play (evt) {
		console.log(evt);
		evt.preventDefault();
		const elm = evt.target;
		const elmwurl = elm.closest('[data-url]');
		if (!elmwurl) return;
		if (elmwurl.className=='calm-link') {
			this.nav(evt, elm);
			return;
		}
		const url = elmwurl.dataset.url;
		const how = elm.nodeName=='I' ? 'lplay' : 'play';
		currentStream = 'Calm Radio: '+elmwurl.parentElement.querySelector('a').innerHTML;
		this.#startPlay(how, url);
		nowPlaying = {name: currentStream, what:'Calm', how: how, url: url};
	}

	fave (how, url) {
		this.#startPlay(how, url);
	}

	nav (evt, elm) {
		evt.preventDefault();
		const url = elm.closest('[data-url]').dataset.url;
		const parms = {what: 'home', bobj: url};
		postAction(this.sr, parms, (data) => {
		//	const el = document.getElementById('calm');
		//	el.innerHTML = data;
			this.pdiv.innerHTML = data;
		}, 1);
	}

	back (evt) {
		console.log(evt);
		this.nav(evt, evt.target);
	}

	get () {
		const parms = {what: 'home'};
		postAction(this.sr, parms, (data) => {
		//	const elm = document.getElementById('calm');
		//	elm.innerHTML = data;
			this.pdiv.innerHTML = data;
		}, 1);
	}

	login (evt,elm) {
		console.log(evt);
		const frm = evt.target.form;
		const parms = {what: 'login', bobj:{user:frm.user.value, pass:frm.pass.value}};
		postAction(this.sr, parms, (data) => {
			if (data) {
				my.alert(data);
			} else {
				elm.closest('dialog').close();
				this.get();
			}
		}, 1);
	}

	logout (evt,elm) {
		console.log(evt);
		my.confirm('Are you sure you want to logout?',{noBtn:'Cancel'})
		.then(yn=>{
			if (!yn) return;
			const parms = {what: 'lllogout'};
			postAction(this.sr, parms, (data) => {
				if (data) {
					my.alert(data);
				} else {
					this.get();
					elm.closest('dialog').close();
				}
			}, 1);
		});
	}

	user () {
		const parms = {what: 'user'};
		postAction(this.sr, parms, (data) => {
			const elm = document.getElementById('calm_user');
			elm.innerHTML = data;
			document.getElementById('calm-user-dialog').showModal();
		}, 1);
	}


	#startPlay (how, url) {
		const parms = {what: how, bobj: url};
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
var Calm = new CalmClass();
