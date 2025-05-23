'use strict';
import cntrlr from '../../lib/controller.js';
import {createReadStream,createWriteStream,existsSync,mkdirSync,readdir,readFileSync,readlinkSync,renameSync,rmSync,statSync,unlinkSync,writeFileSync} from 'fs';
import {readdir as readdirp} from 'fs/promises';
import path from 'path';
//import formidable, {errors as formidableErrors} from 'formidable';
import Busboy from './busboy/lib/main.js';

export default class Fileman {

	constructor () {
		this.debug = true;
		this.baseDir = cntrlr.config.baseDir;
		if (!existsSync(this.baseDir)) {
			mkdirSync(this.baseDir, {recursive:true});
		}
	}

	action (what, parms, resp) {
		//console.log(what,parms);
		let rmsg = '!NOT YET IMPLEMENTED';
		let pbase, fpath, stats;
		switch (what) {
		case 'fcomb':
			if (!existsSync('/usr/bin/ffmpeg') && !existsSync('/usr/local/bin/ffmpeg')) {
				rmsg = '!Required ffmpeg is not present';
				break;
			}
			pbase = this.baseDir+parms.dir+(parms.dir==''?'':'/');
			let eprms = '';
			for (const file of parms.files) {
				fpath = pbase+file;
				eprms += ` -i "${fpath}"`;
				stats = statSync(fpath);
			}
			if (parms.files.length > 1) eprms += ' -codec copy';
			eprms += ` "${pbase+parms.asfile}"`;
			//console.log(eprms);
			cntrlr.execute('ffmpeg -loglevel 16 -n'+eprms)
			.then(m=>resp.end(m));
			return;
			break;
		case 'fdele':
			pbase = this.baseDir+parms.dir+(parms.dir==''?'':'/');
			for (const file of parms.files) {
				fpath = pbase+file;
				stats = statSync(fpath);
				if (stats.isDirectory()) {
					rmSync(fpath, {recursive: true, force: true});
				} else {
					unlinkSync(fpath);
				}
			}
			rmsg = null;
			break;
		case 'fdnld':
			if (parms.files.length>1) {
				rmsg = JSON.stringify({err: '!Multiple file download not yet implemented'});
				break;
			}
			fpath = this.baseDir+parms.dir+parms.files[0];
			stats = statSync(fpath);
			if (stats.isDirectory()) {
				rmsg = JSON.stringify({err: '!Multiple file (i.e. folder) download not yet implemented'});
				break;
			}
			rmsg = JSON.stringify({err: '', fnam: parms.files[0], f64: btoa(fpath)});
			break;
		case 'fmove':
			let fdir = this.baseDir+parms.fdir;
			let tdir = this.baseDir+parms.tdir;
			for (const file of parms.files) {
				renameSync(fdir+file, tdir+file);
			}
			rmsg = null;
			break;
		case 'fnewf':
			let pdir = this.baseDir+parms.dir;
			mkdirSync(path.join(pdir, parms.newf));
			rmsg = null;
			break;
		case 'frnam':
			pbase = this.baseDir+parms.dir+(parms.dir==''?'':'/');
			renameSync(pbase+parms.file, pbase+parms.to);
			rmsg = null;
			break;
		case 'funzp':
			pbase  = this.baseDir+parms.dir+(parms.dir==''?'':'/');
			cntrlr.execute('unzip -d "'+pbase+'" "'+pbase+parms.file+'"')
			.then(m=>resp.end(m));
			//require('child_process').exec('unzip -d "'+pbase+'" "'+pbase+parms.file+'"',{},(error, stdout, stderr)=>{
			//		console.error(error);
			//		rmsg = error ? String(error) : null;
			//		resp.end(rmsg);
			//	});
			return;
			break;
		case 'faddl':
			pbase = this.baseDir+parms.dir;
			//console.log(pbase,parms);
			let plst = '';
			for (const file of parms.files) {
				plst += pbase+file + "\n";
			}
			const pld = cntrlr.config.playlistDir;
			fpath = pld;
			let clst = '';
			rmsg = 'Playlist saved (huh?)';
			try {
				mkdirSync(pld, {recursive:true});
				if (parms.plsel) {
					fpath += parms.plsel;
					clst = readFileSync(fpath, 'utf8')
				} else {
					fpath += btoa(parms.plnam);
				}
				writeFileSync(fpath, clst+plst);
			} catch (err) {
				console.error(err);
				rmsg = 'Failed to write playlist';
			}
			break;
		case 'fview':
			fpath = this.baseDir+parms.fpath;
			stats = statSync(fpath);
			let fp = {fpath, size:stats.size};
			cntrlr.mimeType(fpath)
			.then(m=>{ fp.mtype = m; })
			.then(()=>{
				const fpm = btoa(JSON.stringify(fp));
				console.log(fpm);
				resp.end(JSON.stringify({err: '', fp: fpm}));
			});
			return;
	// @@@@@@@@@@
	// could get file type here and send to client for display adjustments
	//		stats = statSync(fpath);
	//		console.log(stats);
			rmsg = JSON.stringify({err: '', f64: btoa(fpath)});
			break;
		case 'audfls':
			this.#getAllAudioFiles(parms)
			.then((lst)=>resp.end(JSON.stringify(lst)));
			return;
			break;
		case 'fpxy':
			this.#sendFile2(parms.sndf, resp);
			return;
			break;
		case 'sndf':
			this.sendFile(parms, resp);
			return;
			break;
		case 'dirl':
			const dpath = parms.dirl;
			this.getNavMenu(dpath, resp);
			this.getDirList(dpath, resp);
			return;
			break;
		case 'load':
			resp.end(cntrlr.readFile('services/fileman/fileman.html', 'FAILED TO READ'));
			return;
			break;
		}
		resp.end(rmsg);
	}

	getDirList (dir, resp) {
		const idtf = new Intl.DateTimeFormat('en-US',{year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hour12:false,timeZoneName:'short'});
		readdir(this.baseDir+dir, {withFileTypes: true}, (err, files) => {
			if (err) throw err;
			resp.write('<table>');
			let rows = ['<thead><tr><td><input type="checkbox"onchange="Fileman.selectAll(this)"></td><th>Name</th><th>Size</th><th>Date</th></tr></thead>'];
			let pdir = dir == '' ? dir : (dir+'/');
			for (const file of files) {
				let fcl, icn, lnk='';
				if (file.isDirectory()) {
					icn = '<i class="fa fa-folder fa-fw d-icn" aria-hidden="true"></i>';
					fcl = 'isdir" data-dpath="'+pdir+file.name;
				} else {
					icn = '<i class="fa fa-file-o fa-fw" aria-hidden="true"></i>';
					fcl = 'isfil" data-fpath="'+file.name;
				}
				if (file.isSymbolicLink()) {
					lnk = ' <i class="fa fa-arrow-right fa-fw" aria-hidden="true"></i>';
					let lnk2 = readlinkSync(this.baseDir+dir+'/'+file.name);
				//	if (statSync(lnk2).isDirectory()) {
				//		fcl = 'isdir" data-dpath="'+lnk2;
				//	}
					lnk += lnk2;
				}
				const fstat = statSync(this.baseDir+dir+'/'+file.name);
				rows.push('<tr><td><input type="checkbox" class="fsel" name="files[]" value="'+file.name+'"></td>'
					+'<td class="'+fcl+'">'+icn+file.name+lnk+'</td>'
					+'<td>'+this.#formatNumber(fstat.size)+' </td>'
					+'<td> '+idtf.format(fstat.mtimeMs)+'</td></tr>');
			}
			resp.write(rows.join('\n'));
			resp.end('</table>');
		});
	}

	getNavMenu (dir, resp) {
		let nav = '<div class="fmnav">';
		let _D = '';
		let parts = dir.split('/');
		if (parts[0]) {
			nav += '<span class="isdir" data-dpath="."><i class="fa fa-home" aria-hidden="true"></i></span> / ';
		} else {
			nav += '<span><i class="fa fa-home" aria-hidden="true"></i></span>';
		}
		do {
			let _d = parts.shift();
			let _dd = _d;
			if (parts.length) {
				_D += _d + (parts.length>1 ? '/' : '');
				nav += `<span class="isdir" data-dpath="${_D}">${_dd}</span> / `;
			} else {
				nav += `<span>${_d}</span>`;
			}
		} while (parts.length);
		resp.write(nav+'</div>');
	}

	async sendFile (parms, resp) {
		console.log('[Info] Sending zip file');
		let filePath = atob(parms.sndf);
		let stats = statSync(filePath);
		const fmime = await cntrlr.mimeType(filePath);			//console.log(fmime);console.trace();
		resp.setHeader('Content-Length', stats.size);
		if (parms.v) {
			const mtyp = fmime || 'audio/mp4';
			resp.setHeader('Content-Type', mtyp);
		} else {
			resp.setHeader('Content-Type', 'application/octet-stream');
			resp.setHeader('Content-Disposition', 'attachment; filename="'+path.basename(filePath)+'"');
		}
		let stream = createReadStream(filePath);
		stream.on('open', () => {
			stream.pipe(resp);
		});
		stream.on('error', () => {
			resp.setHeader('Content-Type','text/plain');
			resp.status(404).end('Not found');
		});
	}

	async receiveUpload (req, res) {
/*		const form = formidable({uploadDir: cntrlr.config.upldTmpDir, maxFileSize: 2147483648});
		return await form.parse(req, (err, fields, files) => {
			if (err) {
				console.error(err);
				res.writeHead(err.httpCode || 400, {'Content-Type': 'text/plain'});
				res.end(String(err));
			} else {
				const fats = files.upld[0].toJSON();
				renameSync(fats.filepath, path.join(this.baseDir+fields.dir[0], fats.originalFilename));
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end(JSON.stringify({ fields, files }, null, 2));
			}
		});*/

	/* uses fs.createWriteStream above */
	let flds = {};
	const busboy = new Busboy({ headers: req.headers });
	busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) => {
		//console.log(`Field [${fieldname}]: value: ${val}`);
		flds[fieldname] = val;
	});
	busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
		//console.log(fieldname, file, filename, encoding, mimetype, this.baseDir);
		flds.ofn = filename;
		flds.tmpnm = fieldname+Date.now();
		var saveTo = path.join(this.baseDir, flds.tmpnm);
		file.pipe(createWriteStream(saveTo));
	});
	busboy.on('finish', () => {
		renameSync(path.join(this.baseDir, flds.tmpnm), path.join(this.baseDir+flds.dir, flds.ofn));
		res.writeHead(200, { 'Connection': 'close' });
		res.end("That's all folks!");
	});
	return req.pipe(busboy);




	};

	async #getAllAudioFiles (parms) {
		let flist = [], fpath, stats;
		const pbase = this.baseDir+parms.dir+(parms.dir==''?'':'/');
		for (const file of parms.files) {
			fpath = pbase+file;
			stats = statSync(fpath);
			if (stats.isDirectory()) {
				let fils = await this.#getFilesRecursively(fpath,async (fp)=>{
					const m = await cntrlr.mimeType(fp);
					console.log(m);
					return (m && m.startsWith('audio'));
					});
				flist.push(...fils);
			} else {
				const m = await cntrlr.mimeType(fpath);
				if (m && m.startsWith('audio')) flist.push(fpath);
			}
		}
		return flist;
	}

	async #getFilesRecursively (dirPath, filter=(_f)=>true, fileList = []) {
		const files = await readdirp(dirPath, { withFileTypes: true });
		for (const file of files) {
			const filePath = path.join(dirPath, file.name);
			if (file.isDirectory()) {
				await this.#getFilesRecursively(filePath, filter, fileList);
			} else {
				if (await filter(filePath)) fileList.push(filePath);
			}
		}
		return fileList;
	}


	#sendFile2 (parms, resp) {
		console.log('proxy file send');
		const fp = JSON.parse(atob(parms));
		resp.setHeader('Content-Length', fp.size);
		resp.setHeader('Content-Type', fp.mtype);
		let stream = createReadStream(fp.fpath);
		stream.on('open', () => {
			stream.pipe(resp);
		});
		stream.on('error', () => {
			resp.setHeader('Content-Type','text/plain');
			resp.status(404).end('Not found');
		});
	}


	#formatNumber (num) {
		if (num < 1024) {
			return num.toString();
		} else if (num < 1048576) {
			return (num / 1024).toFixed(1) + 'K';
		} else if (num < 1073741824) {
			return (num / 1048576).toFixed(1) + 'M';
		} else {
			return (num / 1073741824).toFixed(1) + 'G';
		}
	}

}
