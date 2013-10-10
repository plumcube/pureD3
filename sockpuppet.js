process.on('uncaughtException', function(err) {
	console.log(err);
	process.exit(1);
});

var spawn 	= require('child_process').spawn;
var util 	= require('util');
var utils	= require('./lib/utils.js');
var services= require('./lib/services.js');
var config 	= require("./config.json");

var routes = {};

//	This worker's info
//
var id = process.pid;

//	When services are bound, start this socket server.
//
services.on("ready", function() {

	//////////////////////////////////////////////////////////////////////////////////
	//																				//
	//									Socket Server								//
	//																				//
	//////////////////////////////////////////////////////////////////////////////////
	
	var SServer = require('ws').Server;
	var socketServer = new SServer({
		port: config.socketPort
	});
	
	socketServer.on('connection', function(socket) {
	
		var head 	= socket.upgradeReq.headers;
		var sec		= "" + head["sec-websocket-key"];
		
		if(sec.length !== 24) {
			return socket.end();
		}
		
		var hash = utils.createHash();
		
		//	On connection we send a welcome message, containing a sessionId
		//	@see	http://wamp.ws/spec#welcome_message
		//
		socket.send(JSON.stringify([0, hash, 1, config.WAMPSig]));
	
		socket.on('message', function(message) {
		
			message = JSON.parse(message);
	
			//	Validate WAMP formatting
			//
			if(util.isArray(message)) {

				var type 	= +message[0];
				var callId	= message[1];
				var method	= message[2];
				var payload	= message[3];
				
				if(!callId) {
					return socket.close();
				}
				
				//	Payload must be an object.
				//
				if(typeof payload !== "object") {
					return socket.close();
				}
				
				var sessionId = payload.sessionId;
				
				if(!sessionId) {
					return socket.close();
				}
				
				switch(type) {
					case 2: 
						if(services[method]) {
							services[method](payload, function(err, result) {
								if(err) {
									socket.send(JSON.stringify([4, callId, err]));
								} else {
									socket.send(JSON.stringify([3, callId, result]));
								}
							});
						} else {
							socket.end();
						}
					break;
					
					default:
					break;
				}
			}
		});
	});
});


