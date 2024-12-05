'use strict';

(function(YTx) {

	const sr = 'yt';	// service route
	let _pb = null;

	const streamSelect = (frm, type) => {
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
			console.log(data);
			if (type=='audio') {
				data.forEach(td => selt.innerHTML += `<tr><td><input type="radio" name="itag" value="${td.itag}"></td><td>${td.mime}</td><td>${td.audbr}</td><td>${td.audsr}</td></tr>`);
			} else {
				data.forEach(td => selt.innerHTML += `<tr><td><input type="radio" name="itag" value="${td.itag}"></td><td>${td.mime}</td><td>${td.size}</td><td>${td.reso}</td><td>${td.audio}</td></tr>`);
			}
		});
	};

	const getPlaylist = (frm) => {
		document.querySelector('#lstTab input[type="submit"]').disabled = true;
		let yturl = encodeURIComponent(frm.yturl.value.trim());
		let wtrk = encodeURIComponent(frm.wtrk.value);
		document.getElementById('dnldf').src = window.location.origin + `?_=yt&act=pxtr&pxtr=${yturl}&wtrk=${wtrk}`;
		_pb = document.getElementById('prog');
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
		document.getElementById('dnldf').src = window.location.origin + `?_=yt&act=axtr&axtr=${yturl}&tnam=${tname}&wtrk=${wtrk}`;
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
		document.getElementById('dnldf').src = window.location.origin + `?_=yt&act=vxtr&vxtr=${yturl}&tnam=${tname}&wtrk=${wtrk}&vida=${vida}`;
	};
	const watchP = () => {
		fetch('?_=yt&act=prog', {method:'GET'})
		.then((resp) => resp.text())
		.then(data => {
			if (data == '.') {
				services.fm.seen = false;
				_pb.innerHTML = '';
				document.querySelector('#lstTab input[type="submit"]').disabled = false;
			} else {
				_pb.innerHTML = data;
				setTimeout(watchP, 1200);
			}
		});
	};

	YTx.extrFini = (wch, msg) => {
		console.log(wch, msg);
		services.fm.seen = false;
		document.querySelector('#'+wch+'Tab i').style.display = 'none';
		document.querySelector('#'+wch+'Tab input[type="submit"]').disabled = false;
		if (msg) setTimeout(()=>alert(msg),100);
	}

	YTx.extractSelected = (elm) => {
		const itag = elm.parentElement.querySelector('input[name="itag"]:checked');
		if (itag) {
			const val = itag.value;
			const typ = elm.getAttribute('stype');
			elm.parentElement.style.display = 'none';
			if (typ=='audio') {
				getVinfo(document.forms.sglform, val);
			} else {
				getVideo(document.forms.vidform, val);
			}
		} else {
			alert('Please first select a track...');
		}
	};

	YTx.frequest = (evt, frm) => {
		evt.preventDefault();
		if (frm.wtrk.value=='s') {
			streamSelect(frm, 'audio');
		} else {
			if (evt.submitter.name=='ginf') getVinfo(frm);
		}
	};
	YTx.prequest = (evt, frm) => {
		evt.preventDefault();
		if (evt.submitter.name=='ginf') getPlaylist(frm);
	};
	YTx.vrequest = (evt, frm) => {
		evt.preventDefault();
		if (frm.wtrk.value=='s') {
			streamSelect(frm, 'video');
		} else {
			if (evt.submitter.name=='ginf') getVideo(frm);
		}
	};

})(window.YTx = window.YTx || {});