'use strict';
/*global svcPop*/
class FavoritesClass {

	sr = 'fa';	// service route

	play (evt) {
		//console.log(evt);
		evt.preventDefault();
		const welm = evt.target.nodeName;
		if (welm!='A') return;
		const fid = evt.target.closest('[data-fid]').dataset.fid;
		const parms = {what: 'play', bobj: fid};
		postAction(this.sr, parms, (data) => {
			if (data) {
				//console.log(data);
				this.#assure(data.what)
				.then(()=>{
					//console.log('assured');
					currentStream = data.name;
					window[data.what].fave(data.how, data.url);
				//console.log([data.what]);
				//	[data.what].fave(data.how, data.url);
				});
			}
		}, 2);
	}

	add () {
		const parms = {what: 'add', bobj: nowPlaying};
		postAction(this.sr, parms, (data) => {
			if (data) my.alert(data);
			services[this.sr].seen = false;
		}, 1);
	}

	delete (evt) {
		evt.preventDefault();
		my.confirm('!Are you sure that you want to delete this favorite?')
		.then(y=>{
			if (!y) return;
			const fid = evt.target.closest('[data-fid]').dataset.fid;
			const parms = {what: 'delete', bobj: fid};
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
		const fid = evt.target.closest('[data-fid]').dataset.fid;
		const dlg = document.getElementById('fave-more');
		dlg.setAttribute('data-fid',fid);
		let name = evt.target.nextElementSibling.innerHTML;
		dlg.querySelector('h3').innerHTML = name;
		dlg.showModal();
	};

	addDirect () {
		my.modal(my._Id('fave-direct').innerHTML, {title:'Direct Link to Audio Stream', yesBtn:'Add to Favorites'})
		.then(r=>{
			//console.log(r);
			if (r.resp=='n') return;
			const parms = {what: 'add', bobj: {name: 'Direct: '+r.data.titl, what: 'Direct', how: r.data.play, url: r.data.surl}};
			postAction(this.sr, parms, (data) => {
				if (data) my.alert(data);
				this.get();
			}, 1);
		});
	}

	get () {
		const parms = {what: 'home'};
		postAction(this.sr, parms, (data) => {
			let elm = document.getElementById('faves');
			elm.innerHTML = data;
		}, 1);
	};


	// make sure the particular service panel (script/html) is populated
	async #assure (what) {
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
			//	if ([what]) {
					clearInterval(wait);
					resolve();
				}
			}, 100);
		});
	}

}
// instantiate it
var Favorites = new FavoritesClass();

/*** an additional class to handle direct urls to streams ***/
class DirectClass {
	sr = 'fa';	// service route
	fave (how, url) {
		//console.log(how, url);
		const parms = {act:'direct', what: how, bobj: url};
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
var Direct = new DirectClass();

