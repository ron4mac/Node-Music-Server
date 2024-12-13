'use strict';

const http = require('http');
const https = require('https');
const qs = require('querystring');
const {URL} = require('url');


//var superagent = require('superagent'),
var  { TimeoutError, 
    WebapiError, 
    WebapiRegularError, 
    WebapiAuthenticationError,
    WebapiPlayerError 
  } =  require('./response-error');

var HttpManager = {};

/* Create superagent options from the base request */
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

/* Make the request to the Web API */
HttpManager.__makeRequest = function(method, options, uri, callback) {
  var req = method.bind(superagent)(uri);

  if (options.query) {
    req.query(options.query);
  }

  if (options.headers) {
    req.set(options.headers);
  }

  if (options.data) {
    req.send(options.data);
  }

  req.end(function(err, response) {
    if (err) {
      if (err.timeout) {
        return callback(new TimeoutError());
      } else if (err.response) {
        return callback(_toError(err.response));
      } else {
        return callback(err);
      }
    }

    return callback(null, {
      body: response.body,
      headers: response.headers,
      statusCode: response.statusCode
    });
  });
};

/**
 * Make a HTTP GET request.
 * @param {BaseRequest} The request.
 * @param {Function} The callback function.
 */
HttpManager.get = function(request, callback) {
  var options = _getParametersFromRequest(request);
  var method = 'GET';

  HttpManager._makeRequest(method, options, request.getURI(), callback);
};

/**
 * Make a HTTP POST request.
 * @param {BaseRequest} The request.
 * @param {Function} The callback function.
 */
HttpManager.post = function(request, callback) {
  var options = _getParametersFromRequest(request);
  var method = 'POST';

  HttpManager._makeRequest(method, options, request.getURI(), callback);
};

/**
 * Make a HTTP DELETE request.
 * @param {BaseRequest} The request.
 * @param {Function} The callback function.
 */
HttpManager.del = function(request, callback) {
  var options = _getParametersFromRequest(request);
  var method = superagent.del;

  HttpManager._makeRequest(method, options, request.getURI(), callback);
};

/**
 * Make a HTTP PUT request.
 * @param {BaseRequest} The request.
 * @param {Function} The callback function.
 */
HttpManager.put = function(request, callback) {
  var options = _getParametersFromRequest(request);
  var method = 'PUT';

  HttpManager._makeRequest(method, options, request.getURI(), callback);
};

module.exports = HttpManager;