'use strict';
var YTx = {};	// js container
// establish some variables
var _pp = 0,
	_pb,
	_fm,
	curDir = '',
	tabcontent,
	tablinks,
	fileseen = false;

YTx.fup_done = (errs) => {
	if (!errs) {
		document.getElementById('filupld').style.display = 'none';
	}
	getDirList(curDir);
}
const getPlaylist = (frm) => {
	document.querySelector('#lstTab input[type="submit"]').disabled = true;
	let yturl = encodeURIComponent(frm.yturl.value.trim());
	let wtrk = encodeURIComponent(frm.wtrk.value);
	document.getElementById('dnldf').src = window.location.origin + `?pxtr=${yturl}&wtrk=${wtrk}`;
	watchP();
};
const getVinfo = (frm) => {
	document.querySelector('#sglTab input[type="submit"]').disabled = true;
	document.querySelector('#sglTab i').style.display = 'inline-block';
	let yturl = encodeURIComponent(frm.yturl.value.trim());
	let tname = encodeURIComponent(frm.tname.value.trim());
	let wtrk = encodeURIComponent(frm.wtrk.value);
	tname = tname ? tname : 'audio_track';
	document.getElementById('dnldf').src = window.location.origin + `?axtr=${yturl}&tnam=${tname}&wtrk=${wtrk}`;
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
const frequest = (evt, frm) => {
	evt.preventDefault();
//	console.log(evt);
	if (evt.submitter.name=='ginf') getVinfo(frm);
};
const prequest = (evt, frm) => {
	evt.preventDefault();
//	console.log(evt);
	if (evt.submitter.name=='ginf') getPlaylist(frm);
};
const openTab = (evt, tabName, cb) => {
	let i;
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = 'none';
	}
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(' active', '');
	}
	// Show the current tab, and add an "active" class to the button that opened the tab
	document.getElementById(tabName).style.display = 'block';
	evt.currentTarget.className += ' active';
	if (typeof cb === 'function') cb();
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
				let todir = evt.target.dataset.dpath || evt.target.parentNode.dataset.dpath || '';
				getDirList(todir);
			});
		});
		const fils = _fm.querySelectorAll('.isfil');
		fils.forEach(elm => {
			elm.addEventListener('click', (evt) => {
				console.log(evt);
				let fpath = evt.target.dataset.fpath || evt.target.parentNode.dataset.fpath || '';
				viewFile(fpath);
			});
		});
	});
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


const fmpop = () => {
	if (!fileseen) getDirList(curDir);
	fileseen = true;
};
const doMenu = (actn, evt) => {
	console.log(actn);
	const slctd = document.querySelectorAll('.fsel:checked'),
		scnt = slctd.length,
		oneItem = () => { if (!scnt) { alert('An item needs to be selected'); } else if (scnt>1) { alert('Please select only one item.'); } else { return true; } return false; },
		hasSome = () => { if (scnt) { return true; } alert('Some items need to be selected'); return false; };
	switch (actn) {
	case 'fdele':
		if (hasSome() && ((scnt==1) || confirm('You have multiple files selected. Are you sure you want to delete ALL the selected files?'))) {
			const files = Array.from(slctd).map(el => el.value);
			//let usp = new URLSearchParams({act:'fdele','dir': curDir,'files': files});
			postAndRefresh({act:'fdele','dir': curDir,'files': files}, 1);
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
		document.getElementById('filupld').style.display = 'block';
//		sessionStorage.nfm_curD = curDir;
		if (doesSupportAjaxUploadWithProgress()) {
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
	}
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

const postAndRefresh = (parms, json=false) => {
	postAction(null, parms, (data) => { if (data) alert(data); else getDirList(curDir) }, json);
};
