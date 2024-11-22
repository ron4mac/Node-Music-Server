'use strict';
const config = require('./config');
const https = require('https');
const http = require('http');
const fs = require('fs');

const settingsFile = 'settings.json';

class Controller {

	constructor () {
		this.config = config;
		this.settings = this._readSettings();
	}

	getSettings () {
		return this.settings;
	}

	getSetting (which, dflt) {
		return which in this.settings ? this.settings[which] : dflt;
	}

	setSettings (values) {
		Object.assign(this.settings, values);
		this._saveSettings();
	}

	deleteSetting (which) {
		delete this.settings[which];
		this._saveSettings();
	}

	// read a file (sync) or return default data
	readFile (path, dflt) {
		try {
			return fs.readFileSync(path,{encoding:'utf8'});
		} catch (err) {
			console.error(err);
			return dflt;
		}
	}


	/* PRIVATE METHODS */

	_readSettings () {
		try {
			return JSON.parse(fs.readFileSync(settingsFile,{encoding:'utf8'}));
		} catch (err) {
			console.error(err);
			return {};
		}
	}
	_saveSettings () {
		fs.writeFileSync(settingsFile, JSON.stringify(this.settings, null, "\t"));
	}
}

module.exports = new Controller();