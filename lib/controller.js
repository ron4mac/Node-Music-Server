'use strict';
import {config} from './config.js';
import https from 'https';
import http from 'http';
import {readFileSync,writeFileSync} from 'fs';
//import Mime from 'mime-lite';

const settingsFile = 'settings.json';

class Controller {

	constructor () {
		this.config = config;
		this.settings = this.#readSettings();
		this.errors = {};
	}

	getSettings () {
		return this.settings;
	}

	getSetting (which, dflt) {
		return which in this.settings ? this.settings[which] : dflt;
	}

	setSettings (values) {
		Object.assign(this.settings, values);
		this.#saveSettings();
	}

	deleteSetting (which) {
		delete this.settings[which];
		this.#saveSettings();
	}

	deleteSettings (which) {
		for (const w of which) {
			delete this.settings[w];
		}
		this.#saveSettings();
	}

	// read a file (sync) or return default data
	readFile (path, dflt) {
		try {
			return readFileSync(path,{encoding:'utf8'});
		} catch (err) {
			console.error(err);
			return dflt;
		}
	}

	// write a file (sync)
	writeFile (path, data) {
		try {
			return writeFileSync(path, data);
		} catch (err) {
			console.error(err);
			return err.code;
		}
	}

	// get the mime type for a file
	async mimeType (path) {
		//return (require('mime-lite')).getType(path);
//		import('mime-lite')
//		.then(m=>{
	//		console.log(m);
//			return m.default.getType(path);
//		});
	//	import * from 'mime-lite';
	//	return Mime.getType(path);
		const m = await import('mime-lite');
		return m.default.getType(path);
	}

	// execute a shell command
	async execute (cmd) {
		const x = await import('child_process');
		x.exec(cmd, {}, (error, stdout, stderr)=>{
			console.error(error);
			return error ? String(error) : null;
		});
	}

	/* PRIVATE METHODS */

	#readSettings () {
		try {
			return JSON.parse(readFileSync(settingsFile,{encoding:'utf8'}));
		} catch (err) {
			console.error(err);
			return {};
		}
	}
	#saveSettings () {
		writeFileSync(settingsFile, JSON.stringify(this.settings, null, "\t"));
	}
}

export default new Controller();
