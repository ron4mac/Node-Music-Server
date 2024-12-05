'use strict';

(function(Fileman) {

	const sr = 'fm';	// service route

	const getDirList = (dirPath) => {
		fetch('?_=fm&act=dirl&dirl='+encodeURIComponent(dirPath), {method:'GET'})
		.then((resp) => resp.text())
		.then(data => {
			_fm.innerHTML = data;
			curDir = dirPath;
			const dirs = _fm.querySelectorAll('.isdir');
			dirs.forEach(elm => {
				elm.addEventListener('click', (evt) => {
					console.log(evt);
					let todir = evt.target.closest('[data-dpath]')?.dataset.dpath;
					getDirList(todir);
				});
			});
			const fils = _fm.querySelectorAll('.isfil');
			fils.forEach(elm => {
				elm.addEventListener('click', (evt) => {
					console.log(evt);
					let fpath = evt.target.closest('[data-fpath]')?.dataset.fpath;
					if (evt.target.nodeName=='I') {
						srvrPlay(fpath);
						return;
					}
					Fileman.view(fpath);
				});
			});
		});
	};

	const postAndRefresh = (parms, json=false) => {
		postAction(sr, parms, (data) => { if (data) alert(data); else getDirList(curDir) }, json);
	};

	Fileman.getDirList = (dir) => getDirList(dir);

	Fileman.menu = (actn, evt) => {
		console.log(actn);
		const slctd = document.querySelectorAll('.fsel:checked'),
			scnt = slctd.length,
			oneItem = () => { if (!scnt) { alert('An item needs to be selected'); } else if (scnt>1) { alert('Please select only one item.'); } else { return true; } return false; },
			hasSome = () => { if (scnt) { return true; } alert('Some items need to be selected'); return false; };
		switch (actn) {
		case 'fcomb':
			if (hasSome()) {
				document.querySelector('#comb i').style.display = 'none';
				modal(document.getElementById('comb'), true);
			}
			//let asf;
			//if (hasSome() && (asf = prompt('Combine/convert to a file named:'))) {
			//	const files = Array.from(slctd).map(el => el.value);
			//	postAndRefresh({act:'fcomb', 'dir': curDir, 'files': files, asfile: asf}, 1);
			//}
			break;
		case 'fdele':
			if (hasSome() && ((scnt==1) || confirm('You have multiple files selected. Are you sure you want to delete ALL the selected files?'))) {
				const files = Array.from(slctd).map(el => el.value);
				postAndRefresh({what:'fdele', bobj:{'dir': curDir, 'files': files}}, 1);
			}
			break;
		case 'fdnld':
			if (hasSome()) {
				const files = Array.from(slctd).map(el => el.value);
				postAction('fm', {what:'fdnld', bobj: {'dir': curDir?(curDir+'/'):'','files': files}}, (data) => {
					if (data) {
						console.log(data);
						if (data.err) {
							alert(data.err);
						} else {
							document.getElementById('dnldf').src = '/?_=fm&act=sndf&sndf='+data.f64;
						}
					} else { alert('download not available'); }
				}, 2);
			}
			break;
		case 'fmove':
			if (scnt) {
				const files = Array.from(slctd).map(el => el.value);
				let usp = JSON.stringify({'fdir': curDir?(curDir+'/'):'','files': files});
				// remember the items in local storage
				sessionStorage.nfm_mvto = usp;
				console.log(evt);
				// show the item count in the span element
				evt.target.firstElementChild.innerHTML = `(${files.length})`;
			} else {
				if (!sessionStorage.nfm_mvto) {
					alert('Nothing previously selected to move');
					break;
				}
				let parms = JSON.parse(sessionStorage.nfm_mvto);
			//	parms.what = 'fmove';
				parms.tdir = curDir?(curDir+'/'):'';
				// clear the remembered items from local storage
				sessionStorage.removeItem('nfm_mvto');
				// resolve the span element and clear it
				let spne = evt.target.dataset.menu ? evt.target.firstElementChild : evt.target;
				spne.innerHTML = '';
				// send the command and then redisplay
				postAndRefresh({what:'fmove', bobj:parms}, 1);
			}
			break;
		case 'fnewf':
				let nfnm = prompt('New folder named:');
				if (nfnm) {
					postAndRefresh({what:'fnewf', bobj:{dir: curDir, newf: nfnm}}, 1);
				//	postAndRefresh('act=fnewf&dir='+encodeURIComponent(curDir)+'&newf='+encodeURIComponent(nfnm));
				//	postAndRefresh({act: 'frnam',dir: curDir,file: curfn,to: nnam});
				}
			break;
		case 'frnam':
			if (oneItem())  {
				let curfn = slctd[0].value;
				let nnam = prompt(`Rename ${curfn} to:`, curfn);
				if (nnam) {
					postAndRefresh({what:'frnam', bobj:{dir: curDir, file:curfn, to:nnam}}, 1);
				//	postAndRefresh('act=frnam&dir='+encodeURIComponent(curDir)+'&file='+encodeURIComponent(curfn)+'&to='+encodeURIComponent(nnam));
				//	postAndRefresh({act: 'frnam',dir: curDir,file: curfn,to: nnam});
				}
			}
			break;
		case 'fupld':
			fup_payload.dir = curDir;
			YTx.Upld5d.Init();
			modal(document.getElementById('filupld'), true);
			break;
		case 'funzp':
			if (oneItem()) {
				let curfn = slctd[0].value;
				postAndRefresh({what:'funzp', bobj:{dir: curDir, file:curfn}}, 1);
			//	postAndRefresh('act=funzp&dir='+encodeURIComponent(curDir)+'&file='+encodeURIComponent(curfn));
			}
			break;
		case 'plmnu':
			if (!hasSome()) break;
			add2Playlist();
			break;
		case 'faddl':
			console.log(evt);
			let dlg = document.getElementById('plmnu');
			let psel = dlg.querySelector('select').value;
			let pnam = dlg.querySelector('input').value.trim();
			if (psel=='' && !pnam) {
				alert('Please provide a playlist name');
				break;
			}
			evt.target.parentElement.querySelector('i').style.display = 'inline-block';
			const files = Array.from(slctd).map(el => el.value);
			postAndRefresh({what:'faddl', bobj:{plnam: pnam, dir:(curDir?curDir:''), 'files': files}}, 1);
			modal(dlg, false);
			evt.target.parentElement.querySelector('i').style.display = 'none';
			plstseen = false;
			break;
		case 'drefr':
			getDirList(curDir);
			break;
		}
	};

	Fileman.view = (fpath) => {
		postAction(sr, {what:'fview', bobj:{'fpath':(curDir?(curDir+'/'):'')+fpath}}, (data) => {
			if (data) {
				console.log(data);
				if (data.err) {
					alert(data.err);
				} else {
					document.querySelector('#fvewd span').innerHTML = fpath;
					document.getElementById('fvewd').style.display = 'block';
					document.getElementById('fvewf').src = '/?_=fm&act=sndf&sndf='+data.f64+'&v=1';
				}
			} else { alert('not available'); }
		}, 2);
	};

	Fileman.doComb = (btn) => {
		let asf = btn.parentElement.querySelector('input').value;
		if (asf) {
			btn.disabled = true;
			btn.parentElement.querySelector('i').style.display = 'inline-block';
			const slctd = document.querySelectorAll('.fsel:checked');
			const files = Array.from(slctd).map(el => el.value);
		//	postAndRefresh({act:'fcomb', 'dir': curDir, 'files': files, asfile: asf}, 1);
			const parms = {what:'fcomb', bobj:{'dir': curDir, 'files': files, asfile: asf}};
			postAction(sr, parms, (data) => {
					btn.disabled = false;
					btn.parentElement.querySelector('i').style.display = 'none';
					if (data) {
						alert(data);
					} else {
						modal(btn.parentElement, false);
						getDirList(curDir);
					}
				}, true);
		}
	}





})(window.Fileman = window.Fileman || {});
