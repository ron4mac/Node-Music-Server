'use strict';

(function(Pand) {

	const sr = 'pd';	// service route

	let socket = null;
	let hasael = false;

	const showTrackArt = (data, pn=true) => {
		const aa = document.getElementById('albumart');
		displayCurrent('Pandora: '+data.snam);
		displayCurrentTrack(data.artistName+' - '+data.songName);
		aa.querySelector('img').src = data.albumArtUrl ? data.albumArtUrl : 'noimage.svg';
		aa.querySelector('.artist').innerHTML = data.artistName;
		aa.querySelector('.album').innerHTML = data.albumName;
		aa.querySelector('.song').innerHTML = data.songName;
		aa.querySelector('.prevnext').style.display = pn?'block':'none';
		aa.style.display = 'block';
	};

	const nextLocal = (sid, snam, aude) => {
		let bobj = {sid: sid, snam: snam};
		const parms = {what: 'lplay', bobj: bobj};
		postAction(sr, parms, (data) => {
			if (data) {
				showTrackArt(data, false);
				aude.src = data.audioUrl;
				aude.play();
			}
		}, 2);
	};

	Pand.play = (evt) => {
		evt.preventDefault();
		let elm = evt.target.closest('[data-sid]');
		const sid = elm.dataset.sid;
		const chnam = elm.querySelector('a').innerHTML;
		let bobj = {sid: sid, snam: chnam};
		currentStream = 'Pandora: '+chnam;
		const parms = {what: 'play', bobj: bobj};
		postAction(sr, parms, (data) => {
			//console.log('PPlay',data);
			//displayCurrent('Pandora: '+evt.target.closest('[data-sid]').querySelector('a').innerHTML);
			mpdUser = sr;
		}, 1);
		nowPlaying = {name: currentStream, what:'Pand', how: 'play', url: bobj};
	};

	Pand.lplay = (evt) => {
		evt.preventDefault();
		let elm = evt.target.closest('[data-sid]');
		const sid = elm.dataset.sid;
		const chnam = elm.querySelector('a').innerHTML;
		let bobj = {sid: sid, snam: chnam};
		currentStream = 'Pandora: '+chnam;
		const parms = {what: 'lplay', bobj: bobj};
		postAction(sr, parms, (data) => {
			if (data) {
				showTrackArt(data, false);
				showLocalAudio(sr, true);
			//	if (!hasael) {
					laudioelm.addEventListener('ended', (evt) => {
						nextLocal(sid,chnam,laudioelm);
					});
			//		hasael = true;
			//	}
				laudioelm.src = data.audioUrl;
				laudioelm.play();
			}
		}, 2);
		nowPlaying = {name: currentStream, what:'Pand', how: 'lplay', url: bobj};
	};

	Pand.fave = (how, url) => {
		// make sure websocket is running
		Pand.socket();
		// play the saved favorite
		const parms = {what: how, bobj: url};
		postAction(sr, parms, (data) => {
			displayCurrent(currentStream);
			if (data) {
				showLocalAudio(sr, true);
				laudioelm.src = data;
				laudioelm.play();
			} else {
				mpdUser = sr;
			}
		}, 1);
	};

	Pand.login = (evt,elm) => {
		console.log(evt);
		let frm = evt.target.form;
		const parms = {what: 'login', bobj:{user:frm.user.value, pass:frm.pass.value}};
		postAction(sr, parms, (data) => {
			if (data) {
				alert(data);
			} else {
				elm.closest('dialog').close();
				Pand.get();
			}
		}, 1);
	};

	Pand.reauth = (evt,elm) => {
		console.log(evt);
		const parms = {what: 'reauth'};
		postAction(sr, parms, (data) => {
			if (data) {
				alert(data);
			} else {
				elm.closest('dialog').close();
				Pand.get();
			}
		}, 1);
	};

	Pand.logout = (evt,elm) => {
		console.log(evt);
		if (!confirm('Are you sure you want to logout?')) return;
		const parms = {what: 'logout'};
		postAction(sr, parms, (data) => {
			if (data) {
				alert(data);
			} else {
				alert('You have been logged out from Pandora');
				elm.closest('dialog').close();
				Pand.get();
			}
		}, 1);
	};

	Pand.user = () => {
		const parms = {what: 'user'};
		postAction(sr, parms, (data) => {
			let elm = document.getElementById('pdor_user');
			elm.innerHTML = data;
			elm.querySelector('dialog').showModal();
		}, 1);
	};

	Pand.socket = () => {
		if (!socket) {
			socket = new WebSocket('ws://'+window.location.hostname+':'+config.pandora_socket);
			// Connection opened
			socket.addEventListener('open', (event) => {
				socket.send('probe');
			});
			// Listen for messages
			socket.addEventListener('message', (event) => {
				console.log('Message from server ', event.data);
			//	let aa = document.getElementById('albumart');
				let data = JSON.parse(event.data);
				if (data.state=='play') {
					showTrackArt(data);
					//displayCurrent('Pandora: '+data.snam);
					//displayCurrentTrack(data.artistName+' - '+data.songName);
					//aa.querySelector('img').src = data.albumArtUrl ? data.albumArtUrl : 'noimage.png';
					//aa.querySelector('.artist').innerHTML = data.artistName;
					//aa.querySelector('.album').innerHTML = data.albumName;
					//aa.querySelector('.song').innerHTML = data.songName;
					//aa.style.display = 'block';
				} else {
				//	displayCurrentTrack('');
					aa.style.display = 'none';
				}
			});
		}
	};

	Pand.get = () => {
		const parms = {what: 'home'};
		const elm = document.getElementById('stations');
		elm.innerHTML = '<i class="fa fa-spinner fa-pulse fa-lg"></i>';
		postAction(sr, parms, (data) => {
			elm.innerHTML = data;
			Pand.socket();
		}, 1);
	};

	Pand.search = () => {
		const sterm = prompt('Search Pandora stations ...');
		if (!sterm) return;
		const parms = {what: 'search', bobj: sterm};
		postAction(sr, parms, (data) => {
			if (!data) return;
			const dlg = document.getElementById('pand-search');
			dlg.querySelector('.results').innerHTML = data;
			dlg.showModal();
		}, 1);
	};

	Pand.add = (evt, mtyp) => {
		evt.preventDefault();
		let mtkn = evt.target.closest('[data-mtkn]').dataset.mtkn;
		const parms = {what: 'add', bobj: {musicToken:mtkn, musicType: mtyp}};
		postAction(sr, parms, (data) => {
			if (data) {
				alert(data);
				Pand.get();
			} else {
				Pand.get();
			}
		}, 1);
	};

	Pand.delete = (evt) => {
		evt.preventDefault();
		if (!confirm('Are you sure that you want to delete this station?')) return;
		let sid = evt.target.closest('[data-sid]').dataset.sid;
		const parms = {what: 'delete', bobj: sid};
		postAction(sr, parms, (data) => {
			if (data) {
				alert(data);
			} else {
				evt.target.closest('dialog').close();
				Pand.get();
			}
		}, 1);
	};

	Pand.more = (evt) => {
		evt.preventDefault();
		let sid = evt.target.closest('[data-sid]').dataset.sid;
		const dlg = document.getElementById('pand-more');
		dlg.setAttribute('data-sid',sid);
		let name = evt.target.nextElementSibling.innerHTML;
		dlg.querySelector('h3').innerHTML = name;
		dlg.showModal();
	};

})(window.Pand = window.Pand || {});