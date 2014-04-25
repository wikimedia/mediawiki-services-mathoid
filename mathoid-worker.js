/*
 * Storoid worker.
 *
 * Configure in storoid.config.json.
 */

// global includes
var express = require('express'),
	cluster = require('cluster'),
	http = require('http'),
	fs = require('fs'),
	child_process = require('child_process'),
	request = require('request'),
	querystring = require('querystring');

var config;

// Get the config
try {
	config = JSON.parse(fs.readFileSync('./mathoid.config.json', 'utf8'));
} catch ( e ) {
	// Build a skeleton localSettings to prevent errors later.
	console.error("Please set up your mathoid.config.json from the example " +
			"storoid.config.json.example");
	process.exit(1);
}

/**
 * The name of this instance.
 * @property {string}
 */
var instanceName = cluster.isWorker ? 'worker(' + process.pid + ')' : 'master';

console.log( ' - ' + instanceName + ' loading...' );



/*
 * Backend setup
 */
var restarts = 10;

var backend,
	backendStarting = false,
	backendPort,
	requestQueue = [];

// forward declaration
var handleRequests;

var backendCB = function () {
	backendStarting = false;
	handleRequests();
};

var startBackend = function (cb) {
	if (backend) {
		backend.removeAllListeners();
		backend.kill('SIGKILL');
	}
	backendPort = Math.floor(9000 + Math.random() * 50000);
	console.error(instanceName + ': Starting backend on port ' + backendPort);
	backend = child_process.spawn('phantomjs', ['main.js', '-p', backendPort]);
	backend.stdout.pipe(process.stderr);
	backend.stderr.pipe(process.stderr);
	backend.on('close', startBackend);
	backendStarting = true;
	// give backend 1 seconds to start up
	setTimeout(backendCB, 1000);
};
startBackend();

/* -------------------- Web service --------------------- */


var app = express.createServer();

// Increase the form field size limit from the 2M default.
app.use(express.bodyParser({maxFieldsSize: 25 * 1024 * 1024}));
app.use( express.limit( '25mb' ) );

app.get('/', function(req, res){
	res.write('<html><body>\n');
	res.write('Welcome to Mathoid. POST to / with var <code>tex</code>');
	res.write('<form action="/" method="POST"><input type="text" name="q"></form>');
	res.end('</body></html>');
});

// robots.txt: no indexing.
app.get(/^\/robots.txt$/, function ( req, res ) {
	res.end( "User-agent: *\nDisallow: /\n" );
});



function handleRequest(req, res, q, type) {
	// do the backend request
        var reqbody = new Buffer(querystring.stringify({q: q, type: type, format: "json"})),
		options = {
		method: 'POST',
		uri: 'http://localhost:' + backendPort.toString() + '/',
		body: reqbody,
		// Work around https://github.com/ariya/phantomjs/issues/11421 by
		// setting explicit upper-case headers (request sends them lowercase
		// by default) and manually encoding the body.
		headers: {
			'Content-Length': reqbody.length,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		timeout: 2000
	};
	request(options, function (err, response, body) {
        try{
            body = new Buffer(body);
        } catch ( e ) {
            body = new Buffer(e.message.toString());
        }
		if (err || response.statusCode !== 200) {
			var errBuf;
			if (err) {
				errBuf = new Buffer(JSON.stringify({
					tex: q,
					log: err.toString(),
					success: false
				}));
			} else {
				errBuf = body;
			}
			res.writeHead(500,
				{
					'Content-Type': 'application/json',
					'Content-Length': errBuf.length
				});
			res.end(errBuf);
			// don't retry the request
			requestQueue.shift();
			startBackend();
			return handleRequests();
		}
		res.writeHead(200,
			{
				'Content-Type': 'application/json',
				'Content-length': body.length
			});
		res.end(body);
		requestQueue.shift();
		handleRequests();
	});
}

handleRequests = function() {
	// Call the next request on the queue
	if (!backendStarting && requestQueue.length) {
		requestQueue[0]();
	}
};


app.post(/^\/$/, function ( req, res ) {
	// First some rudimentary input validation
	if (!(req.body.q)) {
		res.writeHead(400);
		return res.end(JSON.stringify({error: "q (query) post parameter is missing!"}));
	}
	var q = req.body.q;
    var type = req.body.type;
    if (!(req.body.type) ){
        type = 'tex';
    }
	requestQueue.push(handleRequest.bind(null, req, res, q, type));
	// phantomjs only handles one request at a time. Enforce this.
	if (requestQueue.length === 1) {
		// Start this process
		handleRequests();
	}

});


console.log( ' - ' + instanceName + ' ready' );

module.exports = app;

