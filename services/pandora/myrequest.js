'use strict'

const http = require('http');
const https = require('https');
const querystring = require('querystring');

function Request (options, callback) {
	let reqopts = {};
	let urlpath = querystring.encode(options.qs);
	reqopts.hostname = 'tuner.pandora.com';	//options.url + (urlpath ? ('?'+urlpath) : '');
	reqopts.path = '/services/json/' + (urlpath ? ('?'+urlpath) : '');
	if (options.method) reqopts.method = options.method;
	if (options.body) reqopts.body = options.body;
	_reqHttps(reqopts, callback)
}

function _reqHttp (options, callback) {
	const req = http.request(options, (res) => {
		console.log(`STATUS: ${res.statusCode}`);
		console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
		res.setEncoding('utf8');
		res.on('data', (chunk) => {
			console.log(`BODY: ${chunk}`);
		});
		res.on('end', () => {
		console.log('No more data in response.');
		});
	});

	req.on('error', (e) => {
		console.error(`problem with request: ${e.message}`);
	});

	// Write data to request body
	if (options.body) req.write(options.body);
	req.end();
}

function _reqHttps (options, callback) {
	//console.log(options);
	const req = https.request(options, (res) => {
		let data='';
		res.setEncoding('utf8');
		res.on('data', (chunk) => { data += chunk; });
		res.on('end', () => { callback(null, res, data); });
	});
	req.on('error', (e) => { console.error(`problem with request: ${e.message}`); });

	// Write any data to request body
	if (options.body) req.write(options.body);

	req.end();
}

module.exports = Request;