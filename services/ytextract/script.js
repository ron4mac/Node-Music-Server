'use strict';

(function(YTx) {

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
		fetch(`?strms=${yturl}&whch=${type}`, {method:'GET'})
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