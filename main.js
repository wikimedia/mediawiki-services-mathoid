// Version
var VERSION = '0.1-dev';

var system = require('system');
var args = system.args;
var server = require('webserver').create();
var page = require('webpage').create();
var fs = require('fs');

var usage =
  'Usage: phantomjs main.js [options]\n' +
'Options:\n' +
    '  -h,--help            Print this usage message and exit\n' +
    '  -v,--version         Print the version number and exit\n' +
    '  -p,--port <port>     IP port on which to start the server\n' +
    '  -r,--requests <num>  Process this many requests and then exit.  -1 means \n' +
    '                       never stop.\n' +
    '  -b,--bench <page>    Use alternate bench page (default is index.html)\n' +
'  -d,--debug           Enable verbose debug messages\n';

var port = 16000;
var requests_to_serve = -1;
var bench_page = 'index.html';
var debug = false;

// Parse command-line options.  This keeps track of which one we are on
var arg_num = 1;

// Helper function for option parsing.  Allow option/arg in any of
// these forms:
//    1: -p 1234
//    2: --po 1234
//    3: --po=1234
// Returns:
//    1 or 2: true
//    3:      '1234'
//    else:   false
function option_match(name, takes_optarg, arg) {
  var ieq = arg.indexOf('=');

  var arg_key;
  if (arg.substr(0, 2) == '--' && (takes_optarg && ieq != -1)) {  // form #3
    arg_key = arg.substring(2, ieq);
    if (name.substr(0, arg_key.length) == arg_key) {
      return arg.substr(ieq + 1);
    }
    return false;
  }

  if (arg.substr(0, 2) == '--') {
    arg_key = arg.substr(2);
  }
  else if (arg.substr(0, 1) == '-') {
    arg_key = arg.substr(1);
  }
  else {
    return false;
  }
  return name.substr(0, arg_key.length) == arg_key;
}

// This helper handles one option that takes an option-argument
function option_arg_parse(name) {
  var arg = args[arg_num];
  match = option_match(name, true, arg);
  if (!match) return false;

  if (typeof match != 'string') {
    if (arg_num + 1 < args.length) {
      arg_num++;
      match = args[arg_num];
    }
    else {
      phantom.exit(1);
    }
  }

  if (name == 'port') {
      port = match - 0;
  }
  else if (name == 'requests') { requests_to_serve = match - 0; }
  else if (name == 'bench') { bench_page = match; }

  arg_num++;
  return true;
}

var to_exit = false;
while (arg_num < args.length) {
  var arg = args[arg_num];

  if (option_match('help', false, arg)) {
    console.log(usage);
    phantom.exit(0);
    break;
  }

  if (option_match('version', false, arg)) {
    console.log('svgtex version ' + VERSION);
    phantom.exit(0);
    break;
  }

  if (option_match('debug', false, arg)) {
    debug = true;
    arg_num++;
    continue;
  }

  if (option_arg_parse('port')) {
    continue;
  }
  if (option_arg_parse('requests')) {
    continue;
  }
  if (option_arg_parse('bench')) {
    continue;
  }

  console.error("Unrecognized argument: '" + arg + "'. Use '--help' for usage info.");
  phantom.exit(1);
  break;
}

/*
  console.log(
    'port = ' + port + ", " +
    'requests_to_serve = ' + requests_to_serve + ", " +
    'bench_page = ' + bench_page + ", " +
    'debug = ' + debug + "\n"
  );
*/

// activeRequests holds information about any active MathJax requests.  It is
// a hash, with a sequential number as the key.  request_num gets incremented
// for *every* HTTP request, but only requests that get passed to MathJax have an
// entry in activeRequests.  Each element of activeRequests
// is an array of [<response object>, <start time>].
var request_num = 0;
var activeRequests = {};

// This will hold the test HTML form, which is read once, the first time it is
// requested, from test.html.
var test_form_filename = 'test.html';
var test_form = null;

var service = null;

// thanks to:
// stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
function utf8_strlen(str) {
  var m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}

// This is the callback that gets invoked after the math has been converted.
// The argument, data, is an array that holds the three arguments from the
// process() function in engine.js:  the request number, the original
// text, and either the converted svg, or an array of one element
// that holds an error message.
page.onCallback = function(data) {
  var query = data[0],
      num = query.num,
      src = query.q,
      svg_or_error = data[1],
      mml = data[2],
      record = activeRequests[num],
      resp = record[0],
      start_time = record[1],
      duration = (new Date()).getTime() - start_time,
      duration_msg = ', took ' + duration + 'ms.',
      log ,
      validRequest = false,
      success = data[3];
    if( (typeof svg_or_error) === 'string'){
        validRequest = true;
        log = num + ': ' + src.substr(0, 30) + '.. ' +
            src.length + 'B query, OK ' + svg_or_error.length + 'B result' +
            duration_msg;
    } else {
        log = src.substr(0, 30) + '.. ' +
            src.length + 'B query, error: ' + svg_or_error[0] + duration_msg;
    }
  if(query.format == 'json'){
      if ( validRequest ) {
          resp.statusCode = 200;
          out = JSON.stringify({input:src,
              svg:svg_or_error,
              mml:mml,
              log:log,
              success:success});
          resp.setHeader('Content-Type', 'application/json');
          resp.setHeader('Content-Length', utf8_strlen(out).toString() );
          resp.write(out);
      } else {
          resp.statusCode = 400;
          out = JSON.stringify({input:src,
              err:svg_or_error[0],
              mml:mml,
              log:log,
              success:success});
          //out = JSON.stringify({err:data[1][0],svg:data[1],mml:data[2],'log':log,'sucess':false});
          resp.write(out);
          console.log(log);
          phantom.exit(1);
      }
  } else {
  if ((typeof svg_or_error) === 'string') {
    resp.statusCode = 200;
    resp.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    resp.setHeader("Content-Length", utf8_strlen(svg_or_error));
    resp.write(svg_or_error);
    console.log(log);
  }
  else {
    resp.statusCode = 400;    // bad request
    resp.write(svg_or_error[0]);
    console.log(num, log);
  }
  resp.close();
  }
  delete(activeRequests[num]);

  if (!(--requests_to_serve)) {
    phantom.exit();
  }
}


// Parse the request and return an object with the parsed values.
// It will either have an error indication, e.g.
//   { num: 5, status_code: 400, error: "message" }
// Or indicate that the test form should be returned, e.g.
//   { num: 5, test_form: 1 }
// or a valid request, e.g.
//   { num: 5, type: 'tex', q: 'n^2', width: '500' }

function parse_request(req) {
  // Set any defaults here:
  var query = {
    num: request_num++,
    type: 'tex',
    width: null,
    format: 'svg' //possible svg or json
  };

  if (debug) {
    if (req.method == 'POST') {
      console.log("  req.postRaw = '" + req.postRaw + "'");
    }
    else {
      console.log("  req.url = '" + req.url + "'");
    }
  }

  var qs;   // will store the content of the (tex or mml) math
  if (req.method == 'GET') {
    var url = req.url;

    if (url == '' || url == '/') {
      // User has requested the test form
      if (test_form == null && fs.isReadable(test_form_filename)) {
        test_form = fs.read(test_form_filename);  // set the global variable
      }
      if (test_form != null) {
        query.test_form = 1;
      }
      else {
        query.status_code = 500;  // Internal server error
        query.error = "Can't find test form";
      }
      return query;
    }

    var iq = url.indexOf("?");
    if (iq == -1) {  // no query string
      query.status_code = 400;  // bad request
      query.error = "Missing query string";
      return query;
    }

    qs = url.substr(iq+1);
  }

  else if (req.method == 'POST') {
    if (typeof req.postRaw !== 'string') {   // which can happen
      query.status_code = 400;  // bad request
      query.error = "Missing post content";
      return query;
    }
    qs = req.postRaw;
  }

  else {  // method is not GET or POST
    query.status_code = 400;  // bad request
    query.error = "Method " + req.method + " not supported";
    return query;
  }

  var param_strings = qs.split(/&/);
  var num_param_strings = param_strings.length;

  for (var i = 0; i < num_param_strings; ++i) {
    var ps = param_strings[i];
    var ie = ps.indexOf('=');
    if (ie == -1) {
      query.status_code = 400;  // bad request
      query.error = "Can't decipher request parameter";
      return query;
    }
    var key = ps.substr(0, ie);
    var val = decodeURIComponent(ps.substr(ie+1).replace(/\+/g, ' '));
    if (key == 'type') {
      query.type = val;
    }
    else if (key == 'q') {
      query.q = val;
    }
    else if (key == 'width') {
      query.width = parseInt(val) || null;
    }
    else if (key == 'format') {
        query.format = val;
    }
    else {
      query.status_code = 400;  // bad request
      query.error = "Unrecognized parameter name: " + key;
      return query;
    }
  }
  if (!query.q) {   // no source math
    query.status_code = 400;  // bad request
    query.error = "No source math detected in input";
    return query;
  }

  return query;
}

function listenLoop() {
  // Set up the listener that will respond to every new request
  service = server.listen('0.0.0.0:' + port, function(req, resp) {
    var query = parse_request(req);
    var request_num = query.num;
    console.log(request_num + ': ' + "received: " + req.method + " " +
        req.url.substr(0, 30) + " ..");

    if (query.test_form) {
      console.log(request_num + ": returning test form");
      resp.write(test_form);
      resp.close();
    }
    else {
      if (query.error) {
        console.log(request_num + ": error: " + query.error);
        resp.statusCode = query.status_code;
        resp.write(query.error);
        resp.close();
      }

      else {
        // The following evaluates the function argument in the page's context,
        // with query -> _query. That, in turn, calls the process() function in
        // engine.js, which causes MathJax to render the math.  The callback is
        // PhantomJS's callPhantom() function, which in turn calls page.onCallback(),
        // above.  This just queues up the call, and will return at once.
        activeRequests[request_num] = [resp, (new Date()).getTime()];
        page.evaluate(function(_query) {
          window.engine.process(_query, window.callPhantom);
        }, query);
      }
    }
  });

  if (!service) {
    console.log("server failed to start on port " + port);
    phantom.exit(1);
  }
  else {
    console.log("Server started on port " + port);
    console.log("Point your brownser at http://localhost:" + port + " for a test form.");
  }
}

console.log("Loading bench page " + bench_page);
page.open(bench_page, listenLoop);

/* These includeJs calls would allow us to specify the MathJax location as a
   command-line parameter, but then you'd have to take the <script> tags out of
   index.html, and we'd lose the ability to debug by loading that in a browser
   directly.
page.open('index.html', function (status) {
  page.includeJs('mathjax/MathJax.js?config=TeX-AMS-MML_SVG', function() {
    page.includeJs('engine.js', listenLoop);
  });
});
*/


