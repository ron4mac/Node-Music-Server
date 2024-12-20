'use strict';

(function(Playlists) {

	const sr = 'pl';	// service route
	let lclplylst, lclix = 0, tcl = false;

	Playlists.menu = (actn, evt) => {
		console.log(actn);
		const slctd = document.querySelectorAll('.plsel:checked'),
			scnt = slctd.length,
			oneItem = () => { if (!scnt) { alert('An item needs to be selected'); } else if (scnt>1) { alert('Please select only one item.'); } else { return true; } return false; },
			hasSome = () => { if (scnt) { return true; } alert('Some items need to be selected'); return false; };
		switch (actn) {
		case 'pldel':
			if (hasSome() && ((scnt==1) || confirm('You have multiple playlists selected. Are you sure you want to delete ALL the selected playlists?'))) {
				const files = Array.from(slctd).map(el => el.value);
				console.log(files);
				postAndRefresh({what:'pldel',bobj:{'files':files}}, 1);
			}
			break;
		case 'plply':
			if (hasSome()) {
				const files = Array.from(slctd).map(el => el.value);
				console.log(files);
				//postAndRefreshPL({act:'plply','files':files}, 1);
				document.addEventListener('mpdchg', (e) => console.log('mpdchg',e.detail));
				const parms = {what:'plply',bobj:{files:files}};
				postAction(sr, parms, (data) => {
					if (data) alert(data);
					slctd.forEach((cb)=>{cb.checked=false});
					let plnam = files.length>1 ? '[ multiple ]' : atob(files[0]);
					displayCurrent('Playlist: '+plnam);
				}, 1);
			}
			break;
		case 'plvue':
			if (oneItem()) {
				const files = Array.from(slctd).map(el => el.value);
				console.log(files);
				const parms = {what:'plvue', bobj: {file: files[0]}};
				postAction(sr, parms, (data) => {
					let dlg = document.getElementById('utldlg');
					dlg.querySelector('div').innerHTML = data.pl.replace(/\n/gm, '<br>');
					modal(dlg,true);
				}, 2);
			}
			break;
		}
	};

	Playlists.lplay = (evt) => {
		console.log(evt);
		const plfn = evt.target.closest('[data-plfn]')?.dataset.plfn;
		const parms = {what:'plvue', bobj: {file: plfn}};
		postAction(sr, parms, (data) => {
			lclplylst = data.pl.trim().split("\n");
			console.log(lclplylst);
			const cnt = lclplylst.length;
			if (!cnt) return;
			showLocalAudio('pl',true);
			lclix = 0;
			laudioelm.addEventListener('ended', (evt) => {
				if (lclix < cnt) {
					console.log(lclplylst[lclix]);
					displayCurrentTrack(lclplylst[lclix].split('/').pop());
					laudioelm.src = lclplylst[lclix++];
					laudioelm.play();
				}
			});
			if (!tcl) {
				document.addEventListener('pl-laudact', (e) => {
					//console.log('pl-laudact',e.detail);
					switch(e.detail) {
					case 'prev':
						if (lclix>1) {
							lclix-=2;
							displayCurrentTrack(lclplylst[lclix].split('/').pop());
							laudioelm.src = lclplylst[lclix++];
							laudioelm.play();
						}
						break;
					case 'next':
						if (lclix<cnt) {
							displayCurrentTrack(lclplylst[lclix].split('/').pop());
							laudioelm.src = lclplylst[lclix++];
							laudioelm.play();
						}
						break;
					}
				});
				tcl = true;
			}
			displayCurrentTrack(lclplylst[0].split('/').pop());
			laudioelm.src = lclplylst[lclix++];
			laudioelm.play();
		}, 2);
	}

	Playlists.plselchg = (sel) => {
		let ielm = sel.closest('.modl').querySelector('input');
		let dsp = sel.value == '' ? 'visible' : 'hidden';
		ielm.style.visibility = dsp;
	};

	Playlists.get = () => {
		const parms = {what: 'home'};
		postAction(sr, parms, (data) => {
			let elm = document.getElementById('playlists');
			elm.innerHTML = data;
		}, 1);
	};

	const postAndRefresh = (parms, json=false) => {
		postAction(sr, parms, (data) => { if (data) alert(data); else Playlists.get()}, json);
	};

})(window.Playlists = window.Playlists || {});
