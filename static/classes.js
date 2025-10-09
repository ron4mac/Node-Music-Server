'use strict';
/* exported my*/

class MyClass {

	constructor () {
		this.defaults = {
			title: '',			// title at top edge of dialog
			hasX: false,		// whether to have the closeX
			msg: '',			// used in modal above body, before form
			yesBtn: 'Okay',		// returns 'y'
			noBtn: 'Cancel',	// returns 'n'
			altBtn: '',			// a third button; returns 'a'
			callBk: ()=>true	// callback function (dlg,value)=>{}
								// return false from function to keep dlg open
		};
	}

	_Id (elm) { return document.getElementById(elm); }

	alert (msg, options={}) {
		const opts = Object.assign({}, {noBtn:''}, options);
		msg = this._msgClass(msg, opts);
		return this._macp(msg, opts);
	}

	confirm (msg, options={}) {
		const opts = Object.assign({}, options);
		msg = this._msgClass(msg, opts);
		return this._macp(msg, opts);
	}

	prompt (msg, def='', options={}) {
		let txt = '';
		if (typeof def == 'object') {
			options = def;
		} else {
			txt = def;
		}
		const opts = Object.assign({}, {text:txt}, options);
		msg = this._msgClass(msg, opts);
		return this._macp(msg, opts);
	}

	modal (body, options={}) {
		const opts = Object.assign({}, this.defaults, options);
		return new Promise((resolve) => {
			const dlg = document.getElementById('mymodl');
			dlg.className = 'my-modl';
			dlg.returnValue = 'initial';
			dlg.myCBk = opts.callBk;
			dlg.querySelector('.closex').style.display = opts.hasX?'block':'none';
			dlg.querySelector('.modl-titl').innerHTML = opts.title;
			dlg.querySelector('.modl-msg').innerHTML = opts.msg;

			// populate the form body
			let bdy = dlg.querySelector('.modl-body');
			bdy.innerHTML = '';
			if (typeof body === 'string') {
				if (body=='' || body.trim().startsWith('<')) {
					bdy.innerHTML = body;
				} else {
					bdy.appendChild(document.querySelector(body).cloneNode(true));
				}
			} else {
				bdy.appendChild(body);
			}

			// clear any 'pending' status
			this._pend(dlg);
			// set the buttons
			this._setDlgBtns(dlg, opts, true);
			// run the dialog
			this._dlgOpen(dlg, opts, resolve, true);
		});
	}

	// event from dialog submit
	// return false to keep dialog open
	dlgsub (evt) {
		//console.log(evt);
		const dlg = evt.target.closest('dialog');
		this._pend(dlg, true);
		//return false;
		return dlg.myCBk(dlg, evt.submitter.value);
	}

	_macp (msg, options={}) {
		const opts = Object.assign({}, this.defaults, options);
		return new Promise((resolve) => {
			const dlg = document.getElementById('myacpd');
			dlg.className = 'my-acpd-' + (opts.class??'info');
			dlg.returnValue = 'initial';
			dlg.querySelector('.macp-msg').innerHTML = msg;

			// set the prompt input
			const pmpt = dlg.querySelector('.macp-pmpt');
			const pin = pmpt.querySelector('input');
			pin.required = opts.required ? true : false;
			pin.placeholder = opts.placeholder ? opts.placeholder : '';
			let vis;
			if (opts.text!==undefined) {
				vis = "block";
				pin.value = opts.text;
			} else {
				vis = 'none';
			}
			pmpt.style.display = vis;

			// set the buttons
			this._setDlgBtns(dlg, opts);
			// run the dialog
			this._dlgOpen(dlg, opts, resolve);
		});
	}

	_dlgOpen (dlg, opts, resolve, md=false) {
		dlg.addEventListener('close', () => {
			if (md) {
				const fd = new FormData(dlg.querySelector('form'));
				const fdo = this._fd2obj(fd);
				resolve({dlg: dlg, resp: dlg.returnValue, data: fdo});
			} else {
				let resp = (dlg.returnValue=='y');
				if (resp && opts.text!==undefined) {
					resp = dlg.querySelector('form input').value;
				}
				resolve(resp);
			}
		}, {once:true});
		dlg.showModal();
	}

	_setDlgBtns (dlg, opts, md=false) {
		let btn = dlg.querySelector('.YB');
		btn.innerText = opts.yesBtn;
		btn.style.display = opts.yesBtn?'block':'none';
		btn = dlg.querySelector('.NB');
		btn.innerText = opts.noBtn;
		btn.style.display = opts.noBtn?'block':'none';
		if (md) {
			btn = dlg.querySelector('.AB');
			btn.innerText = opts.altBtn;
			btn.style.display = opts.altBtn?'block':'none';
		}
	}

	_pend (dlg, p=false) {
		const bd = dlg.querySelector('.modl-btns');
		const ovr = bd.querySelector('.modl-busy');
		const btns = bd.querySelectorAll('button');
		let dis, vis;
		if (p) {
			dis = true;
			vis = 'block';
		} else {
			dis = false;
			vis = 'none';
		}
		btns.forEach(btn=>{btn.disabled = dis});
		ovr.style.display = vis;
	}

	_fd2obj (fd) {
		let obj = {};
		for (const [k, v] of fd.entries()) {
			if (!obj.hasOwnProperty(k)) {
				obj[k] = v;
				continue;
			}
			if (!Array.isArray(obj[k])) {
				obj[k] = [obj[k]];
			}
			obj[k].push(v);
		}
		return obj;
	}

	_msgClass (msg, opts) {
		if (!opts.class) {
			if (msg.startsWith('!!')) {
				opts.class = 'error';
				return msg.substr(2);
			} else if (msg.startsWith('!')) {
				opts.class = 'warn';
				return msg.substr(1);
			}
		}
		return msg;
	}

}
// instantiate it
const my = new MyClass();


class PlayerControlsObject {
	#srvd = null;
	#locd = null;

	constructor () {
		this.#srvd = document.getElementById('mpd-cntrls');
		this.#locd = document.getElementById('lcl-cntrls');
	}

	focus (l=false) {
		if (l) {
			this.#srvd.style.display = 'none';
			this.#locd.style.display = 'grid';
		} else {
			this.#locd.style.display = 'none';
			this.#srvd.style.display = 'grid';
		}
	}

	dispCurrent (what, l=false) {
		this.#display(what, l ? '.curlocstrm' : '.cursvrstrm');
	}
	dispCurrentTrack (what, l=false) {
		this.#display(what, l ? '.curloctrk' : '.cursvrtrk');
	}

	#display (what, where) {
		document.querySelectorAll(where).forEach((elm)=>{elm.innerHTML = what});
	}

}
// instantiate it
const playObj = new PlayerControlsObject();


class LocalAudioObject {
	#elm = null;
	#sld = null;
	#usr = null;

	playSource (src, svc=null) {
		this.#usr = svc.sr;
		let el = this.#elm;
		if (el) {
			el.pause();
			el.src = '';
			const v = el.volume;
			el = this.#elm = document.createElement('audio');
			el.volume = v;
		} else {
			el = this.#elm = document.createElement('audio');
			const v100 = window.localStorage.getItem('nms_lclvol') || 50;
			el.volume = v100/100;
			this.#sld = document.getElementById('lclvolume');
			this.#sld.value = v100;
			// listen for player controls
//			document.addEventListener('playctl', laudioEvent);
		}
		playObj.focus(true);
		el.addEventListener('canplay', e => e.target.play());
		el.src = src;
	}

	play () {
		this.#elm.play();
	}

	pause () {
		this.#elm.pause();
	}

	stop () {
		el.pause();
		el.fastSeek(0);
		el.src = '';
	}

	volume (v100, bmp=false) {
		if (bmp) v100 = Math.min(Math.max(+this.#sld.value + v100, 0), 100);
		this.#elm.volume = v100/100;
		this.#sld.value = v100;
		window.localStorage.setItem('nms_lclvol', v100);
	}

	get elem () {
		return this.#elm;
	}

	get svc () {
		return this.#usr;
	}

}
// instantiate it
const laObj = new LocalAudioObject();


// a class for services to extend from for commonality 
class ServiceClass {

	oneItem (n) {
		if (!n) { my.alert('!An item needs to be selected') }
		else if (n>1) { my.alert('!Please select only one item.') }
		else { return true }
		return false;
	}
	hasSome (n) {
		if (n) return true;
		my.alert('!Some items need to be selected');
		return false;
	}

}
