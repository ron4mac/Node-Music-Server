'use strict';
/*global svcPop*/
(function(Favorites) {

	const sr = 'fa';	// service route

	// make sure the particular service panel (script/html) is populated
	const assure = async (what) => {
		return new Promise((resolve, reject) => {
			switch (what) {
			case 'Tunein':
				svcPop('ti');
				break;
			case 'Pand':
				svcPop('pd');
				break;
			case 'Calm':
				svcPop('cr');
				break;
			}
			const wait = setInterval(() => {
				if (window[what]) {
					clearInterval(wait);
					resolve();
				}
			}, 100);
		});
	}

	Favorites.play = (evt) => {
		console.log(evt);
		evt.preventDefault();
		const welm = evt.target.nodeName;
		if (welm!='A') return;
		let fid = evt.target.closest('[data-fid]').dataset.fid;
		const parms = {what: 'play', bobj: fid};
		postAction(sr, parms, (data) => {
			if (data) {
				console.log(data);
				assure(data.what)
				.then(()=>{
					currentStream = data.name;
					window[data.what].fave(data.how, data.url);
				});
			}
		}, 2);
	};

	Favorites.add = () => {
		const parms = {what: 'add', bobj: nowPlaying};
		postAction(sr, parms, (data) => {
			if (data) alert(data);
			services[sr].seen = false;
		}, 1);
	};

	Favorites.delete = (evt) => {
		evt.preventDefault();
		if (!confirm('Are you sure that you want to delete this favorite?')) return;
		let fid = evt.target.closest('[data-fid]').dataset.fid;
		const parms = {what: 'delete', bobj: fid};
		postAction(sr, parms, (data) => {
			if (data) {
				alert(data);
			} else {
				evt.target.closest('dialog').close();
				Favorites.get();
			}
		}, 1);
	};

	Favorites.more = (evt) => {
		evt.preventDefault();
		let fid = evt.target.closest('[data-fid]').dataset.fid;
		const dlg = document.getElementById('fave-more');
		dlg.setAttribute('data-fid',fid);
		let name = evt.target.nextElementSibling.innerHTML;
		dlg.querySelector('h3').innerHTML = name;
		dlg.showModal();
	};

	Favorites.get = () => {
		const parms = {what: 'home'};
		postAction(sr, parms, (data) => {
			let elm = document.getElementById('faves');
			elm.innerHTML = data;
		}, 1);
	};

})(window.Favorites = window.Favorites || {});
