'use strict';

//const http = require('http');
const https = require('https');
const qs = require('querystring');
const {URL} = require('url');


var { TimeoutError, WebapiError, WebapiRegularError, WebapiAuthenticationError, WebapiPlayerError } = require('./response-error.cjs');

var HttpManager = {};

/* Create options from the base request */
var _getParametersFromRequest = function(request) {
	var options = {};

	if (request.getQueryParameters()) {
		options.query = request.getQueryParameters();
	}

	if (request.getHeaders() && request.getHeaders()['Content-Type'] === 'application/json') {
		options.data = JSON.stringify(request.getBodyParameters());
	} else if (request.getBodyParameters()) {
		options.data = request.getBodyParameters();
	}

	if (request.getHeaders()) {
		options.headers = request.getHeaders();
	}

	return options;
};

var _toError = function(response) {
	if (typeof response.body === 'object' && response.body.error && typeof response.body.error === 'object' && response.body.error.reason) {
		return new WebapiPlayerError(response.body, response.headers, response.statusCode);
	}

	if (typeof response.body === 'object' && response.body.error && typeof response.body.error === 'object') {
		return new WebapiRegularError(response.body, response.headers, response.statusCode);
	}

	if (typeof response.body === 'object' && response.body.error && typeof response.body.error === 'string') {
		return new WebapiAuthenticationError(response.body, response.headers, response.statusCode);
	}

	/* Other type of error, or unhandled Web API error format */
	return new WebapiError(response.body, response.headers, response.statusCode, response.body);
};

/* Make the request to the Web API */
HttpManager._makeRequest = function(method, options, uri, callback) {
	//console.log(method, options, uri);
	const turl = new URL(uri);	//console.log(turl);
	const qry = options.query ? ('?'+(qs.stringify(options.query.queryParameters || options.query))) : '';
	const opts = {
		method: method,
		protocol: turl.protocol,
		host: turl.host,		//uri,
		path: turl.pathname + qry + turl.search,
		headers: options.headers,
		//body: (new URLSearchParams(options.data)).toString()
		body: method=='PUT' ? options.data : qs.stringify(options.data)
		//body: JSON.stringify(options.data)	///options.data //? JSON.stringify(options.data) : null
	};
	//console.log(opts);
	const req = https.request(opts, (res) => {
		let data='';
		res.setEncoding('utf8');
		res.on('data', (chunk) => { data += chunk; });
		res.on('end', () => {
			if (res.headers['content-type'] && res.headers['content-type'].startsWith('application/json')) {
				callback(null, JSON.parse(data));
			} else {
				callback(null, data);
			}
		});
	});
	req.on('error', (e) => { console.error(`problem with request: ${e.message}`); });

	// Write any data to request body
	if (opts.body) req.write(opts.body);

	req.end();
}


HttpManager.get = function(request, callback) {
	HttpManager._makeRequest(
		'GET',
		_getParametersFromRequest(request),
		request.getURI(),
		callback
	);
};

HttpManager.post = function(request, callback) {
	HttpManager._makeRequest(
		'POST',
		_getParametersFromRequest(request),
		request.getURI(),
		callback
	);
};

HttpManager.del = function(request, callback) {
	HttpManager._makeRequest(
		'DELETE',
		_getParametersFromRequest(request),
		request.getURI(),
		callback
	);
};

HttpManager.put = function(request, callback) {
	HttpManager._makeRequest(
		'PUT',
		_getParametersFromRequest(request),
		request.getURI(),
		callback
	);
};

module.exports = HttpManager;