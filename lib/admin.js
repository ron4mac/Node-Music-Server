'use strict';
import cntrlr from './controller.js';
import { createWriteStream } from 'fs';
import https from 'https';

export default class NmsAdmin {

	static action (parms, resp) {
		let rmsg = '!NOT IMPLEMENTED';
		if (parms.spract == 'u') {
			rmsg = 'Updating music server app ... refresh page in a minute or two';
		//	cntrlr.execute('/usr/bin/systemctl restart nodems')
		//	.then(m=>console.log('updatting: '+m));
			console.log('updating ...');
			NmsAdmin.doUpdate(resp);
		}
		if (parms.spract == 'b') {
			rmsg = 'Rebooting server ... refresh page in a minute or two';
			cntrlr.execute('/usr/bin/systemctl reboot')
			.then(m=>console.log('rebooting: '+m));
		}
		if (parms.spract == 'r') {
			rmsg = 'Restarting music server app ... refresh page';
			cntrlr.execute('/usr/bin/systemctl restart nodems')
			.then(m=>console.log('restarting: '+m));
		}
		if (parms.spract == 'd') {
			rmsg = 'Shutting down the music server ...';
			cntrlr.execute('/usr/sbin/shutdown -h now')
			.then(m=>console.log('shutting down: '+m));
		}
		return rmsg;
	}

	static #getStreamWithRedirects (targetUrl, maxRedirects = 5) {
		if (maxRedirects === 0) throw new Error('Maximum redirects exceeded');
		return new Promise((resolve, reject) => {
			https.get(targetUrl,{headers:{'User-Agent': 'node/nodems/1.2.6'}} , (response) => {
				const statusCode = response.statusCode;
				const location = response.headers.location;
				if (statusCode >= 301 && statusCode <= 308 && location) {
					const newUrl = location;
					NmsAdmin.#getStreamWithRedirects(newUrl, maxRedirects - 1)
					.then(resolve)
					.catch(reject);
				} else if (statusCode >= 200 && statusCode < 300) {
					resolve(response);
				} else {
					reject(new Error(`Request failed with status code ${statusCode}`));
				}
			}).on('error', (err) => {
			  reject(err);
			});
		});
	};

	static #updateFromFile (tag, url, resp) {
		const writeStream = createWriteStream('newversion.zip');
		writeStream.on('finish', () => {
			cntrlr.execute('./update.sh').then(rslt => { resp.end(`Completed update to ${tag} ... restarting (refresh page)`); cntrlr.execute('/usr/bin/systemctl restart nodems'); });
		});
		NmsAdmin.#getStreamWithRedirects(url)
		.then(stream => {
			stream.pipe(writeStream);
		})
		.catch(err => {
			console.error('Error: ', err);
		});
	};

	static doUpdate (resp) {
		fetch('https://api.github.com/repos/ron4mac/Node-Music-Server/releases/latest')
		.then(response => response.json())
		.then(data => {
		//	console.log(data);
			if (data.tag_name.slice(1) > cntrlr.nmsversion) NmsAdmin.#updateFromFile(data.tag_name, data.zipball_url, resp);
			else resp.end('No update available');
		})
		.catch(error => {
			console.error('Error: ', error);
		});
	}

}