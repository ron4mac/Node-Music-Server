'use strict';
const cntrlr = require('../../controller');
//const config = require('../../config');
const fs = require('fs');

module.exports = class Fileman {

	constructor () {
	}

	action (parms, resp) {
		console.log(parms);
		const baseDir = cntrlr.config.baseDir;
		let rmsg = 'NOT YET IMPLEMENTED';
		resp.writeHead(200, {'Content-Type': 'text/plain'});
		let pbase, fpath, stats;
		switch (parms.act) {
		case 'fcomb':
			if (!fs.existsSync('/usr/bin/ffmpeg') && !fs.existsSync('/usr/local/bin/ffmpeg')) {
				rmsg = 'Required ffmpeg is not present';
				break;
			}
			pbase = baseDir+parms.dir+(parms.dir==''?'':'/');
			let eprms = '';
			for (const file of parms.files) {
				fpath = pbase+file;
				eprms += ` -i "${fpath}"`;
				stats = fs.statSync(fpath);
			}
			if (parms.files.length > 1) eprms += ' -codec copy';
			eprms += ` "${pbase+parms.asfile}"`;
			console.log(eprms);
			require('child_process').exec('ffmpeg -loglevel 16 -n'+eprms,{},(error, stdout, stderr)=>{
					console.log(error);
					rmsg = error ? String(error) : null;
					resp.end(rmsg);
				});
			return;
			rmsg = null;
			break;
		case 'plply':
			queMPD(parms.files);
			rmsg = null;
			break;
		case 'pldel':
			for (const file of parms.files) {
				fpath = playlistDir+'/'+file;
				fs.unlinkSync(fpath);
			}
			rmsg = null;
			break;
		case 'plvue':
			rmsg = JSON.stringify({err:'', pl:fs.readFileSync(playlistDir+'/'+parms.file,{encoding:'utf8'})});
			break;
		case 'radio':
			webRadio(parms.what, parms.bobj??'', resp);
			return;
			break;
		case 'calm':
			calmRadio(parms.what, parms.bobj??'', resp);
			return;
			break;
		case 'pandora':
			webPandora(parms.what, parms.bobj??'', resp);
			return;
			break;
		case 'mpd':
			mpdCtrl(parms.what, parms.bobj??'', resp);
			return;
			break;
		case 'fdele':
			pbase = baseDir+parms.dir+(parms.dir==''?'':'/');
			for (const file of parms.files) {
				fpath = pbase+file;
				stats = fs.statSync(fpath);
				if (stats.isDirectory()) {
					fs.rmSync(fpath, {recursive: true, force: true});
				} else {
					fs.unlinkSync(fpath);
				}
			}
			rmsg = null;
			break;
		case 'fdnld':
			if (parms.files.length>1) {
				rmsg = JSON.stringify({err: 'Multiple file download not yet implemented'});
				break;
			}
			fpath = baseDir+parms.dir+parms.files[0];
			stats = fs.statSync(fpath);
			if (stats.isDirectory()) {
				rmsg = JSON.stringify({err: 'Multiple file (i.e. folder) download not yet implemented'});
				break;
			}
			rmsg = JSON.stringify({err: '', fnam: parms.files[0], f64: btoa(fpath)});
			break;
		case 'fmove':
			let fdir = baseDir+parms.fdir;
			let tdir = baseDir+parms.tdir;
			for (const file of parms.files) {
				fs.renameSync(fdir+file, tdir+file);
			}
			rmsg = null;
			break;
		case 'fnewf':
			let pdir = baseDir+parms.dir;
			fs.mkdirSync(path.join(pdir, parms.newf));
			rmsg = null;
			break;
		case 'frnam':
			pbase = baseDir+parms.dir+(parms.dir==''?'':'/');
			fs.renameSync(pbase+parms.file, pbase+parms.to);
			rmsg = null;
			break;
		case 'funzp':
			pbase  = baseDir+parms.dir+(parms.dir==''?'':'/');
			require('child_process').exec('unzip -d "'+pbase+'" "'+pbase+parms.file+'"',{},(error, stdout, stderr)=>{
					console.log(error);
					rmsg = error ? String(error) : null;
					resp.end(rmsg);
				});
			return;
			break;
		case 'faddl':
			pbase = baseDir+parms.dir;
			console.log(pbase,parms.files);
			let plst = '';
			for (const file of parms.files) {
				plst += pbase+file + "\n";
			}
			try {
				fs.writeFileSync(playlistDir+'/'+btoa(parms.plnam), plst);
				// file written successfully
				rmsg = null;
			} catch (err) {
				console.error(err);
				rmsg = 'Failed to write playlist';
			}
			break;
		case 'fview':
			fpath = baseDir+parms.fpath;
	// @@@@@@@@@@
	// could get file type here and send to client for display adjustments
	//		stats = fs.statSync(fpath);
	//		console.log(stats);
			rmsg = JSON.stringify({err: '', f64: btoa(fpath)});
			break;
		case 'splay':
			fpath = baseDir+parms.fpath;
			rmsg = JSON.stringify({err: 'NOT YET IMPLEMENTED', f64: btoa(fpath)});
			break;
		}
		resp.end(rmsg);
	}



}