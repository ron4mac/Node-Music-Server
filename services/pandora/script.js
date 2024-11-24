'use strict';

(function(Pand) {

	let socket = null;

	Pand.login = (evt,elm) => {
		console.log(evt);
		let frm = evt.target.form;
		const parms = {act:'pandora', what: 'login', bobj:{user:frm.user.value, pass:frm.pass.value}};
		postAction(null, parms, (data) => {
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
		const parms = {act:'pandora', what: 'logout'};
		postAction(null, parms, (data) => {
			if (data) {
				alert(data);
			} else {
				elm.closest('dialog').close();
				Pand.get();
			}
		}, 1);
	};

	Pand.user = () => {
		const parms = {act:'pandora', what: 'user'};
		postAction(null, parms, (data) => {
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
				let aa = document.getElementById('albumart');
				let data = JSON.parse(event.data);
				if (data.state=='play') {
					displayCurrentTrack(data.artistName+' - '+data.songName);
					aa.querySelector('img').src = data.albumArtUrl ? data.albumArtUrl : 'noimage.png';
					aa.querySelector('.artist').innerHTML = data.artistName;
					aa.querySelector('.album').innerHTML = data.albumName;
					aa.querySelector('.song').innerHTML = data.songName;
					aa.style.display = 'block';
				} else {
				//	displayCurrentTrack('');
					aa.style.display = 'none';
				}
			});
		}
	}

	Pand.get = () => {
		const parms = {act:'pandora', what: 'home'};
		const elm = document.getElementById('stations');
		elm.innerHTML = '<i class="fa fa-spinner fa-pulse fa-lg"></i>';
		postAction(null, parms, (data) => {
			elm.innerHTML = data;
			Pand.socket();
		}, 1);
	};

	Pand.play = (evt) => {
		evt.preventDefault();
		let bobj = evt.target.closest('[data-sid]').dataset.sid;
		const parms = {act:'pandora', what: 'play', bobj: bobj};
		postAction(null, parms, (data) => {
			console.log('PPlay',data);
			displayCurrent('Pandora: '+evt.target.closest('[data-sid]').innerHTML);
		}, 1);
	};

})(window.Pand = window.Pand || {});