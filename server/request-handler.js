var path = require('path');
var fs = require('fs');
var url = require('url');

var defaultCorsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, accept',
  'access-control-max-age': 10, // Seconds.
};

var contentTypesMap = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.ico': 'image/x-icon',  
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword'
};

var id = 0;
var messages = {results: []};

var updateMessagesLog = (newMessage, callback) => {
  var messagesPath = path.join(__dirname, 'classes/messages/messages.json');
  fs.readFile(messagesPath, 'utf8', function readFileCB(err, data) {
    if (err) { return console.log('File Read Error: ' + err); }

    messages = JSON.parse(data);
    if (newMessage) { messages.results.push(newMessage); }

    id = (messages.results.length < 1) ? 0 : messages.results[messages.results.length - 1].objectId;       
    var json = JSON.stringify(messages);

    if (!newMessage) {
      callback(json);
    } else {
      fs.writeFile(messagesPath, json, 'utf8', () => callback() );      
    }
  });
};

var sendReponse = (response, data, statusCode, contentType) => {
  var headers = defaultCorsHeaders;
  headers['Content-Type'] = contentType;
  response.writeHead(statusCode, headers);
  response.end(data);
};

var addMessageAndRespond = function(json, response) {
  var message = JSON.parse(json);
  message['objectId'] = ++id;
  if ('username' in message) {
    updateMessagesLog(message, () => sendReponse(response, 'Message added to server', 201, 'text/plain') );
  } else {
    sendReponse(response, 'Failed to add messages', 400, 'text/plain');
  }
  
};   

var parseBuffers = (request, callback) => {
  var body = [];
  request.on('data', (chunk) => body.push(chunk) );
  request.on('end', () => {
    body = [].concat(body).toString();
    callback(body);
  });
};

var methods = {
  'GET': (request, response) => updateMessagesLog(null, (json) => sendReponse(response, json, json ? 200 : 404, 'application/json')),
  'POST': (request, response) => parseBuffers(request, (body) => addMessageAndRespond(body, response)),
  'OPTIONS': (request, response) => sendReponse(response, 'Server OK', 200, 'text/plain')
};

var requestHandler = (request, response) => {
  console.log('Serving request type ' + request.method + ' for url ' + request.url);
  
  var clientPath = '/client';
  var uri = url.parse(request.url).pathname;
  uri = (uri === '/') ? '/index.html' : uri;
  
  // Handle Chat messages responses
  if (uri.includes('/classes/messages')) {
    if (request.method in methods) { 
      methods[request.method](request, response); 
    }
  } else {
    // handle Client Static pages files responses
    var filename = process.cwd() + clientPath + uri;
    var contentType = contentTypesMap[path.extname(filename)];
    
    fs.exists(filename, (exists) => {
      if (!exists) { return sendReponse(response, '404 Not Found\n', 404, 'text/plain'); }
      fs.readFile(filename, 'binary', (err, file) => {
        if (err) { return sendReponse(response, err + '\n', 'text/plain'); }
        response.writeHead(200, {'Content-Type': contentType});
        response.write(file, 'binary');
        response.end();
      });
    });
  }
};

exports.requestHandler = requestHandler;

/*************************************************************

You should implement your request handler function in this file.

requestHandler is already getting passed to http.createServer()
in basic-server.js, but it won't work as is.

You'll have to figure out a way to export this function from
this file and include it in basic-server.js so that it actually works.

*Hint* Check out the node module documentation at http://nodejs.org/api/modules.html.

**************************************************************/

// These headers will allow Cross-Origin Resource Sharing (CORS).
// This code allows this server to talk to websites that
// are on different domains, for instance, your chat client.
//
// Your chat client is running from a url like file://your/chat/client/index.html,
// which is considered a different domain.
//
// Another way to get around this restriction is to serve you chat
// client from this domain by setting up static file serving.

// Request and Response come from node's http module.
//
// They include information about both the incoming request, such as
// headers and URL, and about the outgoing response, such as its status
// and content.
//
// Documentation for both request and response can be found in the HTTP section at
// http://nodejs.org/documentation/api/

// Do some basic logging.
//
// Adding more logging to your server can be an easy way to get passive
// debugging help, but you should always be careful about leaving stray
// console.logs in your code.
    
// The outgoing status.
// if (request.method === 'GET') {
//   var statusCode = 200;
// }
// if (request.method === 'POST') {
//   var statusCode = 201;
// }

// See the note below about CORS headers.
// var headers = defaultCorsHeaders;

// Tell the client we are sending them plain text.
//
// You will need to change this if you are sending something
// other than plain text, like JSON or HTML.
// headers['Content-Type'] = 'application/json';

// .writeHead() writes to the request line and headers of the response,
// which includes the status and all headers.
// response.writeHead(statusCode, headers);

// Make sure to always call response.end() - Node may not send
// anything back to the client until you do. The string you pass to
// response.end() will be the body of the response - i.e. what shows
// up in the browser.
//
// Calling .end "flushes" the response's internal buffer, forcing
// node to actually send all the data over to the client.
// response.end(JSON.stringify({results: messages}));
