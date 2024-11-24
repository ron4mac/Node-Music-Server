'use strict';
var YTx = {};	// js container
// establish some variables
var _pp = 0,
	_pb,
	_fm,
	curDir = '',
//	tabcontent,
//	tablinks,
	plstseen = false,
	rdioseen = false,
	calmseen = false,
	pdorseen = false,
	fileseen = false,
	ytxseen = false;
//	pdorSocket = null;
//	radioSocket = null;

YTx.fup_done = (errs) => {
	if (!errs) {
		modal(document.getElementById('filupld'), false);
	}
	getDirList(curDir);
}
const getPlaylist = (frm) => {
	document.querySelector('#lstTab input[type="submit"]').disabled = true;
	let yturl = encodeURIComponent(frm.yturl.value.trim());
	let wtrk = encodeURIComponent(frm.wtrk.value);
	document.getElementById('dnldf').src = window.location.origin + `?pxtr=${yturl}&wtrk=${wtrk}`;
	setTimeout(watchP, 1000);
};
const getVinfo = (frm,itag=false) => {
	document.querySelector('#sglTab input[type="submit"]').disabled = true;
	document.querySelector('#sglTab i').style.display = 'inline-block';
	let yturl = encodeURIComponent(frm.yturl.value.trim());
	let tname = encodeURIComponent(frm.tname.value.trim());
	let wtrk = encodeURIComponent(frm.wtrk.value);
	if (itag) wtrk += '.'+itag;
	tname = tname ? tname : 'audio_track';
	document.getElementById('dnldf').src = window.location.origin + `?axtr=${yturl}&tnam=${tname}&wtrk=${wtrk}`;
};
const extractSelected = (elm) => {
	let itag = elm.parentElement.querySelector('input[name="itag"]:checked').value;
	if (itag) {
		let typ = elm.getAttribute('stype');
		elm.parentElement.style.display = 'none';
		if (typ=='audio') {
			getVinfo(document.forms.sglform, itag);
		} else {
			getVideo(document.forms.vidform, itag);
		}
	}
};
const getVideo = (frm,itag=false) => {
	document.querySelector('#vidTab input[type="submit"]').disabled = true;
	document.querySelector('#vidTab i').style.display = 'inline-block';
	let yturl = encodeURIComponent(frm.yturl.value.trim());
	let tname = encodeURIComponent(frm.tname.value.trim());
	let wtrk = encodeURIComponent(frm.wtrk.value);
	if (itag) wtrk += '.'+itag;
	let vida = encodeURIComponent(frm.vida.value);
	tname = tname ? tname : 'video_track';
	document.getElementById('dnldf').src = window.location.origin + `?vxtr=${yturl}&tnam=${tname}&wtrk=${wtrk}&vida=${vida}`;
};
function extrFini (wch, msg) {
console.log(wch, msg);
	fileseen = false;
	document.querySelector('#'+wch+'Tab i').style.display = 'none';
	document.querySelector('#'+wch+'Tab input[type="submit"]').disabled = false;
	if (msg) setTimeout(()=>alert(msg),100);
}
const watchP = () => {
	fetch('?prog', {method:'GET'})
	.then((resp) => resp.text())
	.then(data => {
		if (data == '.') {
			fileseen = false;
			_pb.innerHTML = '';
			document.querySelector('#lstTab input[type="submit"]').disabled = false;
		} else {
			_pb.innerHTML = data;
			setTimeout(watchP, 1200);
		}
	});
};
const dlfile = () => {
	document.getElementById('dnldf').src = 'video.mp4';
};


const openTab = (evt, tabName, cb) => {
	let tab = evt.currentTarget;
	const pnls = tab.parentElement.nextElementSibling.querySelectorAll(':scope > div.tabcontent');
	let i;
	for (i = 0; i < pnls.length; i++) {
		pnls[i].style.display = 'none';
	}
	const tlnks = tab.parentElement.querySelectorAll('.tablinks');
	for (i = 0; i < tlnks.length; i++) {
		tlnks[i].classList.remove('active');
	}
	// hide/show MPD control as needed
	document.getElementById('mpdcontrols').style.display = tab.classList.contains('nompd') ? 'none' : 'block';
	// Show the current tab, and add an "active" class to the button that opened the tab
	document.getElementById(tabName).style.display = 'block';
	tab.classList.add('active');
	if (typeof cb === 'function') cb();
};

const getPlaylists = () => {
	fetch('?plstl', {method:'GET'})
	.then((resp) => resp.text())
	.then(data => {
		console.log(data);
		document.getElementById('playlists').innerHTML = data;
	});
};
const getDirList = (dirPath) => {
	fetch('?dirl='+encodeURIComponent(dirPath), {method:'GET'})
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
				viewFile(fpath);
			});
		});
	});
};
const add2Playlist = () => {
	fetch('?plmn', {method:'GET'})
	.then((resp) => resp.text())
	.then(data => {
		document.querySelector('#plmnu i').style.display = 'none';
		let dlg = document.getElementById('plmnu');
		dlg.querySelector('div').innerHTML = data;
		modal(dlg, true);
	//	RJ_DlogMgr.hoistTmpl({cselect:'#plmnu'}, {});
	});
}
const plselchg = (sel) => {
	let ielm = sel.closest('.modl').querySelector('input');
	let dsp = sel.value == '' ? 'visible' : 'hidden';
	ielm.style.visibility = dsp;
}
const srvrPlay = (fpath) => {		//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
	postAction(null, {act:'splay', 'fpath':(curDir?(curDir+'/'):'')+fpath}, (data) => {
		if (data) {
			console.log(data);
			if (data.err) {
				alert(data.err);
			}
		} else { alert('server play not available'); }
	}, 2);
};
const viewFile = (fpath) => {
	postAction(null, {act:'fview', 'fpath':(curDir?(curDir+'/'):'')+fpath}, (data) => {
		if (data) {
			console.log(data);
			if (data.err) {
				alert(data.err);
			} else {
				document.querySelector('#fvewd span').innerHTML = fpath;
				document.getElementById('fvewd').style.display = 'block';
				document.getElementById('fvewf').src = '/?sndf='+data.f64+'&v=1';
			}
		} else { alert('download not available'); }
	}, 2);
};
const doComb = (btn) => {
	let asf = btn.parentElement.querySelector('input').value;
	if (asf) {
		btn.disabled = true;
		btn.parentElement.querySelector('i').style.display = 'inline-block';
		const slctd = document.querySelectorAll('.fsel:checked');
		const files = Array.from(slctd).map(el => el.value);
	//	postAndRefresh({act:'fcomb', 'dir': curDir, 'files': files, asfile: asf}, 1);
		const parms = {act:'fcomb', 'dir': curDir, 'files': files, asfile: asf};
		postAction(null, parms, (data) => {
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

// UI display
const displayCurrent = (what) => {
	document.querySelectorAll('.marquis').forEach((elm)=>{elm.innerHTML = what});
}
const displayCurrentTrack = (what) => {
	document.querySelectorAll('.curtrk').forEach((elm)=>{elm.innerHTML = what});
}

// LOCAL AUDIO
const showLocalAudio = (yn) => {
	const acts = yn ? {mpdcontrols:'none',localAudio:'block'} : {localAudio:'none',mpdcontrols:'block'};
	for (const [k, v] of Object.entries(acts)) {
		document.getElementById(k).style.display = v;
	}
}


// MPD direct
const mpdCmd = (cmd) => {
	const parms = {act:'mpd', what: 'cmd', bobj: cmd};
	postAction(null, parms, (data) => {
		if (data) alert(data);
	}, 1);
}
const mpdCmdBug = (cmd) => {
	let mpc = prompt('MPD command:');
	if (!mpc) return;
	const parms = {act:'mpd', what: 'cmdb', bobj: mpc};
	postAction(null, parms, (data) => {
		if (data) alert(data);
	}, 1);
}

// service load helpers
const load_scripts = (elmt,_cb) => {
	if (!elmt) return;
	const scripts = elmt.getElementsByTagName('script');
	if (!scripts) return;

	let file = null,
		fileref = null;
	for (let i = 0; i < scripts.length; i++) {
		file = scripts[i].getAttribute('src');
		if (file) {
			fileref = document.createElement('script');
			fileref.setAttribute('type', 'text/javascript');
			fileref.async = true;
			fileref.onload = _cb;
			fileref.setAttribute('src', file);
			document.getElementsByTagName('head').item(0).appendChild(fileref);
		} else {
			let jsx = scripts[i].innerText;
			window['eval'].call(window, jsx);
		}
	}
};

// TuneIn radio interface
const radioControl = (w) => {
	let what, xtra;
	switch (w) {
	case 'clear':
		what = 'clear';
	//	displayCurrent('');
	//	displayCurrentTrack('');
		break;
	}
	const parms = {act:'radio', what: what, bobj: xtra};
	postAction(null, parms, (data) => {
		if (data) alert(data);
	}, 1);
};
const radioBack = (evt) => {
	console.log(evt);
	evt.preventDefault();
	if (evt.target.nodeName != 'A') return;
	let bobj = evt.target.dataset.bobj;
	const parms = {act:'radio', what: 'home', bobj: bobj};
	postAction(null, parms, (data) => {
		let el = document.getElementById('radio');
		el.innerHTML = data;
	//	let bt = elm.closest('a').innerHTML;
	//	el = document.getElementById('radcrumbs');
	//	if (el.innerHTML) el.innerHTML += '::';
	//	el.innerHTML += '<a href="#" data-bobj="'+bobj+'">'+bt+'</a>';
	}, 1);
};
const radioNav = (evt, elm) => {
	evt.preventDefault();
	let bobj = elm.closest('[data-url]').dataset.url;
	const parms = {act:'radio', what: 'home', bobj: bobj};
	postAction(null, parms, (data) => {
		let el = document.getElementById('radio');
		el.innerHTML = data;
		let bt = elm.closest('a').innerHTML;
		el = document.getElementById('radcrumbs');
		if (el.innerHTML) el.innerHTML += '::';
		el.innerHTML += '<a href="#" data-bobj="'+bobj+'">'+bt+'</a>';
	}, 1);
};
const radioSearch = () => {
	let sterm = prompt('Search radio stations');
	if (sterm) {
		const parms = {act:'radio', what: 'search', bobj: sterm};
		postAction(null, parms, (data) => {
			let el = document.getElementById('radio');
			el.innerHTML = data;
		//	let bt = elm.closest('a').innerHTML;
		//	el = document.getElementById('radcrumbs');
		//	if (el.innerHTML) el.innerHTML += '::';
		//	el.innerHTML += '<a href="#" data-bobj="'+bobj+'">'+bt+'</a>';
		}, 1);
	}
};
const radioPlay = (evt) => {
	//console.log(evt);
	let elm = evt.target;
	let elmwurl = elm.closest('[data-url]');
	if (elmwurl.parentElement.className=='rad-link') {
		radioNav(evt, elm);
		return;
	}
	evt.preventDefault();
	let bobj = elmwurl.dataset.url;
	let how = elm.nodeName=='IMG' ? 'lplay' : 'play';
	const parms = {act:'radio', what: how, bobj: bobj};
	postAction(null, parms, (data) => {
		displayCurrent('Radio: '+elmwurl.querySelector('a').innerHTML);
		if (data) {
			console.log(data);
			showLocalAudio(true);
			const laudio = document.getElementById('localaudio');
			laudio.src = data;
			laudio.play();
		}
	}, 1);
};





const getRadio = () => {
	const parms = {act:'radio', what: 'home'};
	postAction(null, parms, (data) => {
		let elm = document.getElementById('radio');
		elm.innerHTML = data;
	}, 1);
};

const getCalm = () => {
	const parms = {act:'calm', what: 'load'};
	postAction(null, parms, (data) => {
		let elm = document.getElementById('calmradio');
		elm.innerHTML = data;
		load_scripts(elm, (evt)=>Calm.get());
	}, 1);
};

const getPand = () => {
	const parms = {act:'pandora', what: 'load'};
	const elm = document.getElementById('pandora');
	postAction(null, parms, (data) => {
		elm.innerHTML = data;
		load_scripts(elm, (evt)=>Pand.get());
	}, 1);
}

const getYtx = () => {
	const parms = {act:'ytextr', what: 'load'};
	const elm = document.getElementById('ytextract');
	postAction(null, parms, (data) => {
		elm.innerHTML = data;
		load_scripts(elm);
	}, 1);
}


const prevnext = (evt) => {
	let t = evt.target;
	if (t.nodeName=='I') {
		let act = t.classList.contains('left') ? 'previous' : 'next';
		const parms = {act:'mpd', what: 'cmd', bobj: act};
		postAction(null, parms, (data) => {
			if (data) alert(data);
		}, 1);
	}
};
const setVolSlider = () => {
	const parms = {act:'mpd',what:'getVolume',bobj:'getVolume'};
	postAction(null, parms, (data) => {
		document.getElementById('mpdvolume').value = data;
	}, 1);
}
const chgVolume = (elm) => {
	const parms = {act:'mpd',what:'setVolume',bobj:elm.value};
	postAction(null, parms, (data) => {
		if (data) alert(data);
	}, 1);
}
const bmpVolume = (amt) => {
	const parms = {act:'mpd',what:'bumpVolume',bobj:amt};
	postAction(null, parms, (data) => {
		document.getElementById('mpdvolume').value = data;
	}, 1);
}

const mpdSocket = () => {
	const socket = new WebSocket('ws://'+window.location.hostname+':'+config.socket);
	// Connection opened
	socket.addEventListener('open', (event) => {
		socket.send('probe');
	});
	// Listen for messages
	socket.addEventListener('message', (event) => {
		console.log('MPD message from server ', event.data);
		let data = JSON.parse(event.data);
		if (data.track) {
			displayCurrentTrack(data.track);
		}
		if (data.state=='stop') {
			displayCurrent('');
			displayCurrentTrack('');
		}
	});
}



// radio (TuneIn) interface
const tipop = () => {
	if (!rdioseen) {
		setVolSlider();
		getRadio();
	}
	rdioseen = true;
};
// Pandora interface
const pdpop = () => {
	if (!pdorseen) {
		setVolSlider();
		getPand();
	}
	pdorseen = true;
};
// Calm Radio interface
const crpop = () => {
	if (!calmseen) {
		setVolSlider();
		getCalm();
	}
	calmseen = true;
};
// YouTube extraction interface
const ytxpop = () => {
	if (!ytxseen) {
		getYtx();
	}
	ytxseen = true;
};
// Playlists interface
const plpop = () => {
	if (!plstseen) {
		setVolSlider();
		getPlaylists();
	}
	plstseen = true;
};
// file manager interface
const fmpop = () => {
	if (!fileseen) getDirList(curDir);
	fileseen = true;
};


const doPlMenu = (actn, evt) => {
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
			postAndRefreshPL({act:'pldel','files':files}, 1);
		}
		break;
	case 'plply':
		if (hasSome()) {
			const files = Array.from(slctd).map(el => el.value);
			console.log(files);
			//postAndRefreshPL({act:'plply','files':files}, 1);
			const parms = {act:'plply',files:files};
			postAction(null, parms, (data) => {
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
			const parms = {act:'plvue', file: files[0]};
			postAction(null, parms, (data) => {
				let dlg = document.getElementById('utldlg');
				dlg.querySelector('div').innerHTML = data.pl.replace(/\n/gm, '<br>');
				modal(dlg,true);
			}, 2);
		}
		break;
	}
};


const doMenu = (actn, evt) => {
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
			postAndRefresh({act:'fdele', 'dir': curDir, 'files': files}, 1);
		}
		break;
	case 'fdnld':
		if (hasSome()) {
			const files = Array.from(slctd).map(el => el.value);
			postAction(null, {act:'fdnld','dir': curDir?(curDir+'/'):'','files': files}, (data) => {
				if (data) {
					console.log(data);
					if (data.err) {
						alert(data.err);
					} else {
						document.getElementById('dnldf').src = '/?sndf='+data.f64;
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
			parms.act = 'fmove';
			parms.tdir = curDir?(curDir+'/'):'';
			// clear the remembered items from local storage
			sessionStorage.removeItem('nfm_mvto');
			// resolve the span element and clear it
			let spne = evt.target.dataset.menu ? evt.target.firstElementChild : evt.target;
			spne.innerHTML = '';
			// send the command and then redisplay
			postAndRefresh(parms, 1);
		}
		break;
	case 'fnewf':
			let nfnm = prompt('New folder named:');
			if (nfnm) {
				postAndRefresh('act=fnewf&dir='+encodeURIComponent(curDir)+'&newf='+encodeURIComponent(nfnm));
			//	postAndRefresh({act: 'frnam',dir: curDir,file: curfn,to: nnam});
			}
		break;
	case 'frnam':
		if (oneItem())  {
			let curfn = slctd[0].value;
			let nnam = prompt(`Rename ${curfn} to:`, curfn);
			if (nnam) {
				postAndRefresh('act=frnam&dir='+encodeURIComponent(curDir)+'&file='+encodeURIComponent(curfn)+'&to='+encodeURIComponent(nnam));
			//	postAndRefresh({act: 'frnam',dir: curDir,file: curfn,to: nnam});
			}
		}
		break;
	case 'fupld':
		fup_payload.dir = curDir;
		YTx.Upld5d.Init();
		modal(document.getElementById('filupld'), true);
//		sessionStorage.nfm_curD = curDir;
		if (true || doesSupportAjaxUploadWithProgress()) {
			if (upload_winpop) {
				upldAction.H5w();
			} else {
				upldAction.H5o();
			}
		} else {
			if (upload_winpop) {
				upldAction.L4w();
			} else {
				upldAction.L4o();
			}
		}
		break;
	case 'funzp':
		if (oneItem()) {
			let curfn = slctd[0].value;
			postAndRefresh('act=funzp&dir='+encodeURIComponent(curDir)+'&file='+encodeURIComponent(curfn));
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
		postAndRefresh({act:'faddl', plnam: pnam, dir:(curDir?curDir:''), 'files': files}, 1);
		modal(dlg, false);
		evt.target.parentElement.querySelector('i').style.display = 'none';
		plstseen = false;
		break;
	case 'drefr':
		getDirList(curDir);
		break;
	}
};

const modal = (dlg, oc) => {
	if (oc) {
		dlg.parentElement.style.display = 'block';
		dlg.style.display = 'block';
	} else {
		dlg.style.display = 'none';
		dlg.parentElement.style.display = 'none';
	}
}

const toFormData = (obj) => {
	const formData = new FormData();
	Object.keys(obj).forEach(key => {
		if (typeof obj[key] !== 'object') formData.append(key, obj[key]);
		else formData.append(key, JSON.stringify(obj[key]));
	});
	return formData;
};

// json 1 to send, 2 to send and receive
const postAction = (act, parms={}, cb=()=>{}, json=false) => {
	let hdrs = {};
	if (typeof parms === 'object') {
		if (json) {
			parms = JSON.stringify(parms);
		} else {
			if (!(parms instanceof FormData)) parms = toFormData(parms);
		}
	} else if (typeof parms === 'string') {
		if (!json) parms = new URLSearchParams(parms);
	}
	if (json) hdrs['Content-Type'] = 'application/json';
	if (act) parms.set('act', act);

	fetch('?_FM', {method:'POST', headers:hdrs, body:parms})
	.then(resp => { if (!resp.ok) throw new Error('Network response was not OK'); if (json==2) return resp.json(); else return resp.text() })
	.then(data => cb(data))
	.catch(err => alert(err));
};

const postAndRefreshPL = (parms, json=false) => {
	postAction(null, parms, (data) => { if (data) alert(data); else getPlaylists() }, json);
};
const postAndRefresh = (parms, json=false) => {
	postAction(null, parms, (data) => { if (data) alert(data); else getDirList(curDir) }, json);
};
