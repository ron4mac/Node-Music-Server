'use strict';
var YTx = {};	// js container
// establish some variables
var _pp = 0,
	_pb,
	_fm,
	curDir = '',
	currentStream = '',
	laudioctl = null,
	laudioelm = null,
	nowPlaying = {};


YTx.fup_done = (errs) => {
	if (!errs) {
		modal(document.getElementById('filupld'), false);
	}
	Fileman.getDirList(curDir);
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
	if (typeof cb === 'function') {
		cb();
	} else if (typeof cb === 'string') {
		svcPop(cb);
	}
};

const getPlaylists = () => {
	fetch('?plstl', {method:'GET'})
	.then((resp) => resp.text())
	.then(data => {
		console.log(data);
		document.getElementById('playlists').innerHTML = data;
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
};
const plselchg = (sel) => {
	let ielm = sel.closest('.modl').querySelector('input');
	let dsp = sel.value == '' ? 'visible' : 'hidden';
	ielm.style.visibility = dsp;
};
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


// UI display
const displayCurrent = (what) => {
	document.querySelectorAll('.curstrm').forEach((elm)=>{elm.innerHTML = what});
};
const displayCurrentTrack = (what) => {
	document.querySelectorAll('.curtrk').forEach((elm)=>{elm.innerHTML = what});
};

// LOCAL AUDIO
const showLocalAudio = (yn) => {
	//const acts = yn ? {mpdcontrols:'none',localAudio:'block'} : {localAudio:'none',mpdcontrols:'block'};
	//for (const [k, v] of Object.entries(acts)) {
	//	document.getElementById(k).style.display = v;
	//}
	if (laudioctl) laudioctl.remove();
	laudioelm = null;
	const ladiv = document.getElementById('localAudio');
	const laudt = document.getElementById('local-audio').content.cloneNode(true);
	ladiv.prepend(laudt);
	laudioctl = ladiv.children[0];
	laudioelm = ladiv.querySelector('audio');
	ladiv.style.display = 'block';
	return;



	laudioelm = document.createElement('AUDIO');
	laudioelm.innerHTML = 'Your browser does not support the audio element.';
	laudioelm.setAttribute('controls','');
	ladiv.prepend(laudioelm);
	laudioelm.insertAdjacentHTML('beforebegin','<i class="fa fa-arrow-circle-left" step="prev"></i>');
	laudioelm.insertAdjacentHTML('afterend','<i class="fa fa-arrow-circle-right" step="next"></i>');
	ladiv.style.display = 'block';
};
const laudioAction = (evt) => {
	console.log(evt);
	const telm = evt.target;
	if (telm.nodeName=='I' && telm.hasAttribute('step')) {
		console.log(telm.getAttribute('step'));
		document.dispatchEvent(new CustomEvent('laudact', {bubbles: true, detail: telm.getAttribute('step')}));
	}
}


var services = {
	fa: {seen:false, id:'favorites',	cb:(evt)=>Favorites.get()},
	ti: {seen:false, id:'tunein',		cb:(evt)=>Tunein.get()},
	cr: {seen:false, id:'calmradio',	cb:(evt)=>Calm.get()},
	pd: {seen:false, id:'pandora',		cb:(evt)=>Pand.get()},
	fm: {seen:false, id:'filemanTab',	cb:(evt)=>Fileman.getDirList(curDir)},
	yt: {seen:false, id:'ytextract',	cb:null},
	pl: {seen:false, id:'plstsTab',		cb:(evt)=>Playlists.get()}
};

// populate a selected service interface panel
const svcPop = (sid) => {
	if (!services[sid].seen) {
		const parms = {what: 'load'};
		postAction(sid, parms, (data) => {
			let elm = document.getElementById(services[sid].id);
			elm.innerHTML = data;
			load_scripts(elm, services[sid].cb);
		}, 1);
		services[sid].seen = true;
	}
};

// service load helpers
{
	let sc = 0;
	// execute (eval) script snippets
	// load script files and call back when last script is fully loaded
	var load_scripts = (elmt, _cb) => {
		if (!elmt) return;
		const scripts = elmt.getElementsByTagName('script');
		if (!scripts) return;

		let file = null,
			fref = null;
		for (let i = 0; i < scripts.length; i++) {
			file = scripts[i].getAttribute('src');
			if (file) {
				sc++;
				fref = document.createElement('script');
				fref.setAttribute('type', 'text/javascript');
				fref.async = true;
				fref.onload = ()=>{if (--sc==0 && _cb) _cb()};
				fref.setAttribute('src', file);
				document.getElementsByTagName('head').item(0).appendChild(fref);
			} else {
				const jsx = scripts[i].innerText;
				window['eval'].call(window, jsx);
			}
		}
	};
}


// make sure the particular service panel (script/html) is populated
const assureService = async (what) => {
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
		case 'Playlists':
			svcPop('pl');
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




/* working with MPD */
// MPD direct
const mpdCmd = (cmd) => {
	const parms = {act:'mpd', what: 'cmd', bobj: cmd};
	postAction(null, parms, (data) => {
		if (data) alert(data);
	}, 1);
};
const mpdCmdBug = (cmd) => {
	let mpc = prompt('MPD command:');
	if (!mpc) return;
	const parms = {act:'mpd', what: 'cmdb', bobj: mpc};
	postAction(null, parms, (data) => {
		if (data) alert(data);
	}, 1);
};

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
		document.dispatchEvent(new CustomEvent('mpdchg', {bubbles: true, detail: data}));
		if (data.track) {
			displayCurrentTrack(data.track);
		}
		if (data.state=='stop') {
			displayCurrent('');
			displayCurrentTrack('');
		}
	});
}


const xxxdoPlMenu = (actn, evt) => {
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
			document.addEventListener('mpdchg', (e) => console.log('mpdchg',e.detail));
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
const postAction = (tos, parms={}, cb=()=>{}, json=false) => {
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
	const url = tos ? ('/_'+tos) : '?_Q'

	fetch(url, {method:'POST', headers:hdrs, body:parms})
	.then(resp => { if (!resp.ok) throw new Error('Network response was not OK'); if (json==2) return resp.json(); else return resp.text() })
	.then(data => cb(data))
	.catch(err => alert(err));
};

//const postAndRefreshPL = (parms, json=false) => {
//	postAction(null, parms, (data) => { if (data) alert(data); else getPlaylists() }, json);
//};

