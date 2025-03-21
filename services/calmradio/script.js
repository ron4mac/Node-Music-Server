'use strict';
/*global my*/
class CalmClass {

	sr = 'cr';	// service route

	constructor () {
		this.pdiv = document.getElementById('calm');
	}

	play (evt) {
		//console.log(evt);
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
		currentStream = 'Calm Radio: '+elm.parentElement.querySelector('a').innerHTML;
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
		//console.log(evt);
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
		//console.log(evt);
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
		//console.log(evt);
		my.confirm('Are you suuuure you want to logout?',{noBtn:'Cancel'})
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
			const opts = data.logged ? {
				title:'Settings for Calm Radio',
				yesBtn:'Log Out',
				altBtn:'Save Settings',
				callBk: (dlg, v)=>{
					if (v=='y') {
						this.#useract (dlg, v);
						return false;
					} else {
						return true;
					}
				}
				//cbk: (a,b,c)=>this.#useract(a,b,c)
			} : {
				title:'Calm Radio Login',
				yesBtn:'Log In',
				cbk: (a,b,c)=>this.#useract(a,b=='y'?'l':b,c)
			};
			my.modal(data.body, opts)
			.then(yn=>{
				// response from dialog close
				//console.log(yn,data);
				if (!data.logged && yn.resp=='y') yn.resp = 'l';
				this.#useract(yn.dlg,yn.resp,yn.data);
			});
		}, 2);
	}


	#useract (dlg, resp, data) {
		//console.log(dlg,'11',resp,'22',data);
		if (resp=='y') {
			my.confirm('Are you sure you want to logout?',{yesBtn:'Yes',noBtn:'Cancel'})
			.then(y=>{
				if (!y) return;
				const parms = {what: 'logout'};
				postAction(this.sr, parms, (data) => {
					if (data) {
						my.alert(data);
					} else {
						this.get();
						dlg.close();
					}
				}, 1);
			});
		}
		if (resp=='a') {
			const parms = {what: 'usave', bobj: data};
			postAction(this.sr, parms, (data) => {
				if (data) {
					my.alert(data);
				} else {
				//	this.get();
					dlg.close();
				}
			}, 1);
		}
		if (resp=='l') {
			const parms = {what: 'login', bobj:{user:data.user, pass:data.pass}};
			postAction(this.sr, parms, (data) => {
				if (data) {
					my.alert(data);
				} else {
					dlg.close();
					this.get();
				}
			}, 1);
		}
	//	if (resp=='n') {
	//		dlg.close();
	//	}
	}

	#startPlay (how, url) {
		const parms = {what: how, bobj: url};
		postAction(this.sr, parms, (data) => {
			displayCurrent(currentStream);
			displayCurrentTrack('');
			if (data) {
				if (data.error) {
					my.alert(data.error,{class:'warn'});
				}
				if (data.url) {
					showLocalAudio(this.sr);
					laudioelm.src = data.url;
					laudioelm.play();
				}
			}
		}, 2);
	}

}
// instantiate it
var Calm = new CalmClass();
