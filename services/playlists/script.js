'use strict';

class PlaylistsClass extends ServiceClass {

	sr = 'pl';	// service route
	lclplylst = [];
	lclix = 0;
	tcl = false;

	menu (actn, evt) {
		//console.log(actn);
		const slctd = document.querySelectorAll('.plsel:checked'),
			scnt = slctd.length;
		switch (actn) {
		case 'pldel':
			if (super.hasSome(scnt)) {
				if (scnt==1) {
					this.#delFiles(slctd);
				} else {
					my.confirm('!You have multiple files selected. Are you sure you want to delete ALL the selected files?',{yesBtn:'YES'})
					.then(y=>{
						if (y) this.#delFiles(slctd);
					});
				}
			}
			break;
		case 'plply':
			if (super.hasSome(scnt)) {
				const files = Array.from(slctd).map(el => el.value);
				//console.log(files);
				//postAndRefreshPL({act:'plply','files':files}, 1);
				document.addEventListener('mpdchg', (e) => console.log('mpdchg',e.detail));
				let plnam = 'Playlist: ' + (files.length>1 ? '[ multiple ]' : atob(files[0]));
				const parms = {what:'plply',bobj:{realm:plnam, files:files}};
				postAction(this.sr, parms, (data) => {
					if (data) my.alert(data);
					slctd.forEach((cb)=>{cb.checked=false});
					displayCurrent(plnam);
				}, 1);
			}
			break;
		case 'plvue':
			if (super.oneItem(scnt)) {
				const files = Array.from(slctd).map(el => el.value);
				//console.log(files);
				const parms = {what:'plvue', bobj: {file: files[0]}};
				postAction(this.sr, parms, (data) => {
					my.alert(data.pl.replace(/\n/gm, '<br>'));
				}, 2);
			}
			break;
		}
	}

	lplay (evt) {
		//console.log('a',evt);
		const plfn = evt.target.closest('[data-plfn]')?.dataset.plfn;
		const parms = {what:'plget', bobj: {file: plfn}};
		postAction(this.sr, parms, (data) => {
			this.lclplylst = data.pl.trim().split("\n");
			//console.log('b',this.lclplylst);
			const cnt = this.lclplylst.length;
			if (!cnt) return;
			showLocalAudio(this,true);
			this.lcix = 0;
			laudioelm.addEventListener('ended', (evt) => {
				if (this.lcix < cnt) {
					//console.log('c',this.lclplylst[this.lcix]);
					displayCurrentTrack(this.lclplylst[this.lcix].split('/').pop());
					laudioelm.src = encodeURI(this.lclplylst[this.lcix++]);
//					laudioelm.play();
				}
			});
			if (!this.tcl) {
				document.addEventListener('pl-laudact', (e) => {
					//console.log('d','pl-laudact',e.detail);
					switch(e.detail) {
					case 'prev':
						if (this.lcix>1) {
							this.lcix-=2;
							displayCurrentTrack(this.lclplylst[this.lcix].split('/').pop());
							laudioelm.src = encodeURI(this.lclplylst[this.lcix++]);
//							laudioelm.play();
						}
						break;
					case 'next':
						if (this.lcix<cnt) {
							displayCurrentTrack(this.lclplylst[this.lcix].split('/').pop());
							laudioelm.src = encodeURI(this.lclplylst[this.lcix++]);
//							laudioelm.play();
						}
						break;
					}
				});
				this.tcl = true;
			}
			displayCurrentTrack(this.lclplylst[0].split('/').pop());
			laudioelm.src = encodeURI(this.lclplylst[this.lcix++]);
//			laudioelm.play();
		}, 2);
	}

	lerror () {
		const cnt = this.lclplylst.length;
		//console.log('e',this.lclplylst);
		if (this.lcix<cnt) {
			displayCurrentTrack(this.lclplylst[this.lcix].split('/').pop());
			laudioelm.src = encodeURI(this.lclplylst[this.lcix++]);
//			laudioelm.play();
		}
	}

	plselchg (sel) {
		let ielm = sel.closest('.modl').querySelector('input');
		let dsp = sel.value == '' ? 'visible' : 'hidden';
		ielm.style.visibility = dsp;
	}

	get () {
		const parms = {what: 'home'};
		postAction(this.sr, parms, (data) => {
			let elm = document.getElementById('playlists');
			elm.innerHTML = data;
		}, 1);
	}


	#delFiles (slctd) {
		const files = Array.from(slctd).map(el => el.value);
		//console.log(files);
		this.#postAndRefresh({what:'pldel',bobj:{'files':files}}, 1);
	}

	#postAndRefresh (parms, json=false) {
		postAction(this.sr, parms, (data) => { if (data) my.alert(data); else this.get()}, json);
	}

}
// instantiate it
var Playlists = new PlaylistsClass();
