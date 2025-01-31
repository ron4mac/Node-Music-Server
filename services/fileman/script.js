'use strict';

class FilemanClass extends ServiceClass {

	sr = 'fm';	// service route
	curDir = '';

	menu (actn, evt) {
		//console.log(actn);
		const slctd = document.querySelectorAll('.fsel:checked'),
			scnt = slctd.length;
		switch (actn) {
		case 'fcomb':
			if (super.hasSome(scnt)) {
				document.querySelector('#comb i').style.display = 'none';
				modal(document.getElementById('comb'), true);
			}
			break;
		case 'fdele':
			if (super.hasSome(scnt)) {
				if (scnt==1) {
					this.#delFiles(slctd);
				} else {
					my.confirm('You have multiple files selected. Are you sure you want to delete ALL the selected files?',{yesBtn:'YES',class:'warn'})
					.then(y=>{
						if (y) this.#delFiles(slctd);
					});
				}
			}
			break;
		case 'fdnld':
			if (super.hasSome(scnt)) {
				const files = Array.from(slctd).map(el => el.value);
				postAction('fm', {what:'fdnld', bobj: {'dir': this.curDir?(this.curDir+'/'):'','files': files}}, (data) => {
					if (data) {
						//console.log(data);
						if (data.err) {
							my.alert(data.err);
						} else {
							document.getElementById('dnldf').src = '/?_=fm&act=sndf&sndf='+data.f64;
						}
					} else { my.alert('download not available'); }
				}, 2);
			}
			break;
		case 'fmove':
			if (scnt) {
				const files = Array.from(slctd).map(el => el.value);
				let usp = JSON.stringify({'fdir': this.curDir?(this.curDir+'/'):'','files': files});
				// remember the items in local storage
				sessionStorage.nfm_mvto = usp;
				//console.log(evt);
				// show the item count in the span element
				evt.target.firstElementChild.innerHTML = `(${files.length})`;
			} else {
				if (!sessionStorage.nfm_mvto) {
					my.alert('Nothing previously selected to move');
					break;
				}
				let parms = JSON.parse(sessionStorage.nfm_mvto);
			//	parms.what = 'fmove';
				parms.tdir = this.curDir?(this.curDir+'/'):'';
				// clear the remembered items from local storage
				sessionStorage.removeItem('nfm_mvto');
				// resolve the span element and clear it
				let spne = evt.target.dataset.menu ? evt.target.firstElementChild : evt.target;
				spne.innerHTML = '';
				// send the command and then redisplay
				this.#postAndRefresh({what:'fmove', bobj:parms}, 1);
			}
			break;
		case 'fnewf':
			my.prompt('New folder named:', {yesBtn:'Create'})
			.then(v=>{
				if (v===false) return;
				this.#postAndRefresh({what:'fnewf', bobj:{dir: this.curDir, newf: v}}, 1);
			});
			break;
		case 'frnam':
			if (super.oneItem(scnt)) {
				let curfn = slctd[0].value;
				my.prompt(`Rename ${curfn} to:`, curfn, {yesBtn:'Rename',required:true})
				.then(nn=>{
					if (!nn) return;
					this.#postAndRefresh({what:'frnam', bobj:{dir: this.curDir, file:curfn, to:nn}}, 1);
				});
			}
			break;
		case 'fupld':
			fup_payload.dir = this.curDir;
			Upld5d.Init(500*1024*1024);
			modal(document.getElementById('filupld'), true);
			break;
		case 'funzp':
			if (super.oneItem(scnt)) {
				let curfn = slctd[0].value;
				this.#postAndRefresh({what:'funzp', bobj:{dir: this.curDir, file:curfn}}, 1);
			//	postAndRefresh('act=funzp&dir='+encodeURIComponent(curDir)+'&file='+encodeURIComponent(curfn));
			}
			break;
		case 'plmnu':
			if (!super.hasSome(scnt)) break;
			//assureService('Playlists')
			//.then(()=>add2Playlist());
			this.#add2Playlist();
			break;
		case 'faddl':
			//console.log(evt);
			let dlg = document.getElementById('plmnu');
			let psel = dlg.querySelector('select').value;
			let pnam = dlg.querySelector('input').value.trim();
			if (psel=='' && !pnam) {
				my.alert('Please provide a playlist name');
				break;
			}
			evt.target.parentElement.querySelector('i').style.display = 'inline-block';
			const files = Array.from(slctd).map(el => el.value);
			this.#postAndRefresh({what:'faddl', bobj:{plsel: psel, plnam: pnam, dir:(this.curDir?this.curDir:''), 'files': files}}, 1);
			modal(dlg, false);
			evt.target.parentElement.querySelector('i').style.display = 'none';
			//services.pl.seen = false;
			Playlists.get();
			break;
		case 'drefr':
			this.refresh();
			break;
		}
	}

	getDirList (dir) {
		this.#getDirList(dir);
	}

	view (fpath) {
		postAction(this.sr, {what:'fview', bobj:{'fpath':(this.curDir?(this.curDir+'/'):'')+fpath}}, (data) => {
			if (data) {
				//console.log(data);
				if (data.err) {
					my.alert(data.err);
				} else {
					document.querySelector('#fvewd span').innerHTML = fpath;
					document.getElementById('fvewd').style.display = 'block';
				//	document.getElementById('fvewf').src = '/?_=fm&act=sndf&sndf='+data.f64+'&v=1';
					document.getElementById('fvewf').src = '/?_=fm&act=fpxy&sndf='+data.fp;
				}
			} else { my.alert('not available'); }
		}, 2);
	}

	doComb (btn) {
		let asf = btn.parentElement.querySelector('input').value;
		if (asf) {
			btn.disabled = true;
			btn.parentElement.querySelector('i').style.display = 'inline-block';
			const slctd = document.querySelectorAll('.fsel:checked');
			const files = Array.from(slctd).map(el => el.value);
		//	postAndRefresh({act:'fcomb', 'dir': curDir, 'files': files, asfile: asf}, 1);
			const parms = {what:'fcomb', bobj:{'dir': this.curDir, 'files': files, asfile: asf}};
			postAction(this.sr, parms, (data) => {
					btn.disabled = false;
					btn.parentElement.querySelector('i').style.display = 'none';
					if (data) {
						my.alert(data);
					} else {
						modal(btn.parentElement, false);
						this.refresh();
					}
				}, true);
		}
	}

	refresh () {
		this.#getDirList(this.curDir);
	}

	fup_done (errs) {
		if (!errs) {
			modal(document.getElementById('filupld'), false);
		}
		this.refresh();
	}


	#delFiles (lst) {
		const files = Array.from(lst).map(el => el.value);
		this.#postAndRefresh({what:'fdele', bobj:{'dir': this.curDir, 'files': files}}, 1);
	}

	#getDirList (dirPath='') {
		if (dirPath=='.') dirPath = '';
		fetch('?_=fm&act=dirl&dirl='+encodeURIComponent(dirPath), {method:'GET'})
		.then((resp) => resp.text())
		.then(data => {
			const _fm = document.getElementById('fileman');
			_fm.innerHTML = data;
			this.curDir = dirPath;
			const dirs = _fm.querySelectorAll('.isdir');
			dirs.forEach(elm => {
				elm.addEventListener('click', (evt) => {
					//console.log(evt);
					const todir = evt.target.closest('[data-dpath]')?.dataset.dpath;
					this.#getDirList(todir);
				});
			});
			const fils = _fm.querySelectorAll('.isfil');
			fils.forEach(elm => {
				elm.addEventListener('click', (evt) => {
					//console.log(evt);
					const fpath = evt.target.closest('[data-fpath]')?.dataset.fpath;
					this.view(fpath);
				});
			});
		});
	}

	#add2Playlist () {
		const parms = {what: 'plmn'};
		postAction('pl', parms, (data) => {
			document.querySelector('#plmnu i').style.display = 'none';
			const dlg = document.getElementById('plmnu');
			dlg.querySelector('div').innerHTML = data;
			modal(dlg, true);
			svcPop('pl');
		}, true);
	}

	#postAndRefresh (parms, json=false) {
		postAction(this.sr, parms, (data) => { if (data) my.alert(data); else this.refresh() }, json);
	}

}
// instantiate it
var Fileman = new FilemanClass();
