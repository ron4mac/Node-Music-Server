'use strict';

class PandClass {

	sr = 'pd';	// service route
	socket = null;
	last = '';

	play (evt) {
		evt.preventDefault();
		const elm = evt.target.closest('[data-sid]');
		const sid = elm.dataset.sid;
		const chnam = elm.querySelector('a').innerHTML;
		const bobj = {sid: sid, snam: chnam};
		currentStream = 'Pandora: '+chnam;
		const parms = {what: 'play', bobj: bobj};
		postAction(this.sr, parms, (data) => {
			if (data.error) {
				my.alert(data.error,{class:'warn'});
			} else {
				nowPlaying = {name: currentStream, what:'Pand', how: 'play', url: bobj};
			}
		}, 2);
	}

	lplay (evt) {
		evt.preventDefault();
		const elm = evt.target.closest('[data-sid]');
		const sid = elm.dataset.sid;
		const chnam = elm.querySelector('a').innerHTML;
		const bobj = {sid: sid, snam: chnam};
		currentStream = 'Pandora: '+chnam;
		const parms = {what: 'lplay', bobj: bobj};
		postAction(this.sr, parms, (data) => {
			if (data) {
				this.#showTrackArt(data, false);
				showLocalAudio(this.sr, true);
				laudioelm.addEventListener('ended', (evt) => {
					this.#nextLocal(sid,chnam,laudioelm);
				});
				laudioelm.src = data.audioUrl;
				laudioelm.play();
			}
		}, 2);
		nowPlaying = {name: currentStream, what:'Pand', how: 'lplay', url: bobj};
	}

	fave (how, url) {
		// make sure websocket is running
		this.#socket();
		// play the saved favorite
		const parms = {what: how, bobj: url};
		postAction(this.sr, parms, (data) => {
			displayCurrent(currentStream);
			if (data) {
				showLocalAudio(this.sr, true);
				laudioelm.src = data;
				laudioelm.play();
			}
		}, 1);
	}

	login (evt,elm) {
		//console.log(evt);
		let frm = evt.target.form;
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

	user () {
		const parms = {what: 'user'};
		postAction(this.sr, parms, (data) => {
			let elm = document.getElementById('pdor_user');
			elm.innerHTML = data;
			elm.querySelector('dialog').showModal();
		}, 1);
	}

	reauth (evt,elm) {
		//console.log(evt);
		const parms = {what: 'reauth'};
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
		my.confirm('!Are you sure you want to logout?')
		.then(y=>{
			if (!y) return;
			const parms = {what: 'logout'};
			postAction(this.sr, parms, (data) => {
				if (data) {
					my.alert(data);
				} else {
					my.alert('!You have been logged out from Pandora');
					elm.closest('dialog').close();
					this.get();
				}
			}, 1);
		});
	}

	get () {
		const parms = {what: 'home'};
		const elm = document.getElementById('stations');
		elm.innerHTML = '<i class="fa fa-spinner fa-pulse fa-lg"></i>';
		postAction(this.sr, parms, (data) => {
			elm.innerHTML = data;
			this.#socket();
		}, 1);
	};

	search () {
		my.prompt('Search Pandora stations ...',this.last,{yesBtn:'Search',required:true})
		.then(st=>{
			if (!st) return;
			this.last = st;
			const parms = {what: 'search', bobj: st};
			postAction(this.sr, parms, (data) => {
				if (!data) return;
				const dlg = document.getElementById('pand-search');
				dlg.querySelector('.results').innerHTML = data;
				dlg.showModal();
			}, 1);
		});
	}

	add (evt, mtyp) {
		evt.preventDefault();
		let mtkn = evt.target.closest('[data-mtkn]').dataset.mtkn;
		const parms = {what: 'add', bobj: {musicToken:mtkn, musicType: mtyp}};
		postAction(this.sr, parms, (data) => {
			if (data) {
				my.alert(data);
				this.get();
			} else {
				this.get();
			}
		}, 1);
	}

	delete (evt) {
		evt.preventDefault();
		my.confirm('!Are you sure that you want to delete this station?')
		.then(y=>{
			if (!y) return;
			const sid = evt.target.closest('[data-sid]').dataset.sid;
			const parms = {what: 'delete', bobj: sid};
			postAction(this.sr, parms, (data) => {
				if (data) {
					my.alert(data);
				} else {
					evt.target.closest('dialog').close();
					this.get();
				}
			}, 1);
		});
	}

	more (evt) {
		evt.preventDefault();
		const sid = evt.target.closest('[data-sid]').dataset.sid;
		const dlg = document.getElementById('pand-more');
		dlg.setAttribute('data-sid',sid);
		const name = evt.target.nextElementSibling.innerHTML;
		dlg.querySelector('h3').innerHTML = name;
		dlg.showModal();
	}


	#showTrackArt (data, pn=true) {
		const aa = document.getElementById('albumart');
		displayCurrent('Pandora: '+data.snam);
		displayCurrentTrack(data.artistName+' - '+data.songName);
		aa.querySelector('img').src = data.albumArtUrl ? data.albumArtUrl : 'static/noimage.svg';
		aa.querySelector('.artist').innerHTML = data.artistName;
		aa.querySelector('.album').innerHTML = data.albumName;
		aa.querySelector('.song').innerHTML = data.songName;
		aa.querySelector('.prevnext').style.display = pn?'block':'none';
		aa.style.display = 'block';
	}

	#nextLocal (sid, snam, aude) {
		const bobj = {sid: sid, snam: snam};
		const parms = {what: 'lplay', bobj: bobj};
		postAction(this.sr, parms, (data) => {
			if (data) {
				this.#showTrackArt(data, false);
				aude.src = data.audioUrl;
				aude.play();
			}
		}, 2);
	}

	#socket () {
		if (!this.socket) {
			this.socket = new WebSocket('ws://'+window.location.hostname+':'+config.pandora_socket);
			// Connection opened
			this.socket.addEventListener('open', (event) => {
				this.socket.send('probe');
			});
			// Listen for messages
			this.socket.addEventListener('message', (event) => {
				//console.log('Message from server ', event.data);
				let data = JSON.parse(event.data);
				if (data.state=='play') {
					this.#showTrackArt(data);
				} else {
				//	displayCurrentTrack('');
				//	aa.style.display = 'none';
				}
			});
		}
	}
	
}
// instantiate it
var Pand = new PandClass();

