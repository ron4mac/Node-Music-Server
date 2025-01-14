'use strict';

// establish some variables
var currentStream = '',
	laudioelm = null,
	laudiosvu = '',
	nowPlaying = {};


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
	if (tab.parentElement.offsetHeight > 80) {
		tab.parentElement.style.left = '-80rem';
	}
};

const tabMenu = (evt) => {
	const tabm = document.querySelector('.tab');
	const lft = tabm.style.left == '0px' ? '-80rem' : '0px';
	tabm.style.left = lft;
}

// UI display
const displayCurrent = (what) => {
	document.querySelectorAll('.curstrm').forEach((elm)=>{elm.innerHTML = what});
};
const displayCurrentTrack = (what) => {
	document.querySelectorAll('.curtrk').forEach((elm)=>{elm.innerHTML = what});
};


// LOCAL AUDIO
const showLocalAudio = (svc, pn=false) => {
	// remove any existing listener and audio element
	document.removeEventListener('playctl', laudioEvent);
	if (laudioelm) laudioelm.src='';
	laudioelm = null;
	// create the audio element
	laudioelm = document.createElement('audio');
	// set its volume to reflect the last value
	const v100 = window.localStorage.getItem('nms_lclvol') || 50;
	laudioelm.volume = v100/100;
	document.getElementById('mpdvolume').value = v100;
	// listen for player controls
	document.addEventListener('playctl', laudioEvent);
	
};

const laudioEvent = (evt) => {
//console.log(evt);
	const [what, val] = evt.detail.split(' ', 2);
	switch(what) {
	case 'vset':
		laudioelm.volume = val/100;
		window.localStorage.setItem('nms_lclvol', val);
		break;
	case 'bump':
		let nuv = laudioelm.volume + val/100;
		nuv = val<0 ? Math.max(nuv,0) : Math.min(nuv,1);
		laudioelm.volume = nuv;
		window.localStorage.setItem('nms_lclvol', Math.round(nuv*100));
		break;
	case 'pause':
		if (val==1) laudioelm.pause();
		else laudioelm.play();
		break;
	case 'stop':
		laudioelm.src='';
		document.removeEventListener('playctl', laudioEvent);
		laudioelm = null;
		break;
	}
};

const laudioAction = (evt) => {
	//console.log(evt);
	const telm = evt.target;
	if (telm.nodeName=='I' && telm.hasAttribute('step')) {
		//console.log(telm.getAttribute('step'));
		document.dispatchEvent(new CustomEvent(laudiosvu+'-laudact', {bubbles: true, detail: telm.getAttribute('step')}));
		//console.log(laudiosvu+'-laudact');
	}
};


var services = {
	fa: {seen:false, id:'favorites',	cb:(evt)=>Favorites.get()},
	ti: {seen:false, id:'tunein',		cb:(evt)=>Tunein.get()},
	cr: {seen:false, id:'calmradio',	cb:(evt)=>Calm.get()},
	pd: {seen:false, id:'pandora',		cb:(evt)=>Pand.get()},
	sp: {seen:false, id:'spotifyTab',	cb:(evt)=>Spot.get()},
	fm: {seen:false, id:'filemanTab',	cb:(evt)=>Fileman.getDirList()},
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
};


/* working with MPD */
// MPD direct
const mpdCmd = (cmd) => {
	document.dispatchEvent(new CustomEvent('playctl', {bubbles: true, detail: cmd}));
	const parms = {act:'mpd', what: 'cmd', bobj: cmd};
	postAction(null, parms, (data) => {
		if (data) my.alert(data);
	}, 1);
};
const mpdCmdBug = (cmd) => {
	my.prompt('MPD command:')
	.then(v=>{
		if (v===false) return;
		const parms = {act:'mpd', what: 'cmdb', bobj: v};
		postAction(null, parms, (data) => {
			if (data) my.alert(data.replace(/\n/g,'<br>'));
		}, 1);
	});
};

const prevnext = (evt) => {
	let t = evt.target;
	if (t.nodeName=='I') {
		let act = t.classList.contains('left') ? 'previous' : 'next';
		const parms = {act:'mpd', what: 'cmd', bobj: act};
		postAction(null, parms, (data) => {
			if (data) my.alert(data);
		}, 1);
	}
};
const setVolSlider = () => {
	const parms = {act:'mpd',what:'getVolume',bobj:'getVolume'};
	postAction(null, parms, (data) => {
		document.getElementById('mpdvolume').value = data;
	}, 1);
};
const chgVolume = (elm) => {
	document.dispatchEvent(new CustomEvent('playctl', {bubbles: true, detail: 'vset '+elm.value}));
	const parms = {act:'mpd',what:'setVolume',bobj:elm.value};
	postAction(null, parms, (data) => {
		if (data) my.alert(data);
	}, 1);
};
const bmpVolume = (amt) => {
	document.dispatchEvent(new CustomEvent('playctl', {bubbles: true, detail: 'bump '+amt}));
	const parms = {act:'mpd',what:'bumpVolume',bobj:amt};
	postAction(null, parms, (data) => {
		document.getElementById('mpdvolume').value = data;
	}, 1);
};

const mpdSocket = () => {
	const socket = new WebSocket('ws://'+window.location.hostname+':'+config.socket);
	// Connection opened
	socket.addEventListener('open', (event) => {
		socket.send('probe');
	});
	// Listen for messages
	socket.addEventListener('message', (event) => {
		//console.log('MPD message from server ', event.data);
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
};


const modal = (dlg, oc) => {
	if (oc) {
		dlg.parentElement.style.display = 'flex';
		dlg.style.display = 'block';
	} else {
		dlg.style.display = 'none';
		dlg.parentElement.style.display = 'none';
	}
};


const getFormValues = (frm) => {
	const formData = new FormData(frm);
	let values = {};
	for (const [key, value] of formData.entries()) {
		if (values[key]) {
			if (Array.isArray(values[key])) {
				values[key].push(value);
			} else {
				values[key] = [values[key],value];
			}
		} else {
			values[key] = value;
		}
	}
	//console.log(values);
	return values;
};

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
	const url = tos ? ('/_'+tos) : '?_Q';

	fetch(url, {method:'POST', headers:hdrs, body:parms})
	.then(resp => { if (!resp.ok) throw new Error('Network response was not OK'); if (json==2) return resp.json(); else return resp.text() })
	.then(data => cb(data))
	.catch(err => my.alert(err,{class:'error'}));
};
