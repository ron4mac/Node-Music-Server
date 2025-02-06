'use strict';

class YTxClass {

	sr = 'yt';	// service route
	_pb = null;
	polli = null;

	extractSelected (elm) {
		const itag = elm.parentElement.querySelector('input[name="itag"]:checked');
		if (itag) {
			const val = itag.value;
			const typ = elm.getAttribute('stype');
			elm.parentElement.style.display = 'none';
			if (typ=='audio') {
				this.#getAudio(document.forms.sglform, val);
			} else {
				this.#getVideo(document.forms.vidform, val);
			}
		} else {
			my.alert('Please first select a track...');
		}
	}

	frequest (evt, frm) {
		evt.preventDefault();
		if (frm.wtrk.value=='s') {
			this.#streamSelect(frm, 'audio');
		} else {
			if (evt.submitter.name=='ginf') this.#getAudio(frm);
		}
	}

	prequest (evt, frm) {
		evt.preventDefault();
		if (evt.submitter.name=='ginf') this.#getPlaylist(frm);
	}

	vrequest (evt, frm) {
		evt.preventDefault();
		if (frm.wtrk.value=='s') {
			this.#streamSelect(frm, 'video');
		} else {
			if (evt.submitter.name=='ginf') this.#getVideo(frm);
		}
	}

	extrFini (wh, msg) {
		document.querySelector('#'+wh+'Tab i').style.display = 'none';
		document.querySelector('#'+wh+'Tab input[type="submit"]').disabled = false;
		my.alert(msg);
		if (typeof Fileman == 'object') Fileman.refresh();
	}


	#streamSelect (frm, type) {
		let selt = document.querySelector('#sseld table tbody');
		if (type=='audio') {
			selt.innerHTML = '<tr><td></td><th>MIME</th><th>BITS</th><th>SAMPLE</th></tr>';
		} else {
			selt.innerHTML = '<tr><td></td><th>Mime</th><th>Size</th><th>Resolution</th><th>Has&nbsp;Audio</th></tr>';
		}
		document.querySelector('#sseld button').setAttribute('stype',type);
		document.getElementById('sseld').style.display = 'block';
		let yturl = encodeURIComponent(frm.yturl.value.trim());
		fetch(`?_=yt&act=strms&strms=${yturl}&whch=${type}`, {method:'GET'})
		.then((resp) => resp.json())
		.then(data => {
			//console.log(data);
			if (type=='audio') {
				data.forEach(td => selt.innerHTML += `<tr><td><input type="radio" name="itag" value="${td.itag}"></td><td>${td.mime}</td><td>${td.audbr}</td><td>${td.audsr}</td></tr>`);
			} else {
				data.forEach(td => selt.innerHTML += `<tr><td><input type="radio" name="itag" value="${td.itag}"></td><td>${td.mime}</td><td>${td.size}</td><td>${td.reso}</td><td>${td.audio}</td></tr>`);
			}
		});
	}
	#getPlaylist (frm) {
		this._pb = document.getElementById('prog');
		document.querySelector('#lstTab input[type="submit"]').disabled = true;
		const yturl = encodeURIComponent(frm.yturl.value.trim());
		const wtrk = encodeURIComponent(frm.wtrk.value);
		document.getElementById('dnldf').src = window.location.origin + `?_=yt&act=pxtr&pxtr=${yturl}&wtrk=${wtrk}`;
		this.polli = setInterval(this.#watchP, 1000, this);
	}
	#getAudio (frm, itag=false) {
		document.querySelector('#sglTab input[type="submit"]').disabled = true;
		document.querySelector('#sglTab i').style.display = 'inline-block';
		const yturl = frm.yturl.value.trim();
		let tname = frm.tname.value.trim();
		let wtrk = frm.wtrk.value;
		if (itag) wtrk += '.'+itag;
		tname = tname ? tname : 'audio_track';
		postAction(this.sr, {what: 'axtr', bobj: {yturl, tname, wtrk}}, (data) => {
			this.extrFini('sgl',data);
		}, 1);
	}
	#getVideo (frm, itag=false) {
		document.querySelector('#vidTab input[type="submit"]').disabled = true;
		document.querySelector('#vidTab i').style.display = 'inline-block';
		const yturl = frm.yturl.value.trim();
		let tname = frm.tname.value.trim();
		let wtrk = frm.wtrk.value;
		if (itag) wtrk += '.'+itag;
		const vida = frm.vida.value;
		tname = tname ? tname : 'video_track';
		postAction(this.sr, {what: 'vxtr', bobj: {yturl, tname, wtrk, vida}}, (data) => {
			this.extrFini('vid',data);
		}, 1);
	}
	#watchP (self) {
		fetch('?_=yt&act=prog', {method:'GET'})
		.then((resp) => resp.text())
		.then(data => {
			if (data == '.') {
				clearInterval(self.polli);
				self._pb.innerHTML = '';
				document.querySelector('#lstTab input[type="submit"]').disabled = false;
				if (typeof Fileman == 'object') Fileman.refresh();
			} else {
				self._pb.innerHTML = data;
			}
		});
	}

}
// instantiate it
var YTx = new YTxClass();
