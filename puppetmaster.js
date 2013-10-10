var os		= require('os');
var dgram	= require('dgram');
var jade	= require('jade');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var config 	= require("./config.json");

process.on('uncaughtException', function(err) {
	console.log(err);
	process.exit(1);
});

//////////////////////////////////////////////////////////////////////////////////
//																				//
//								UDP MESSAGE LISTENER							//
//																				//
//////////////////////////////////////////////////////////////////////////////////

//	Receives messages via UDP socket.
//
//	Messages:
//	"stop"	: 	stops the server.
//				@see bin/stop_server
//
var exchange = dgram.createSocket('udp4');
exchange.on("message", function(msg, info) {

	var wid;

	//	Messages are buffers
	//
	switch(msg.toString()) {
	
		case "stop":
			for(wid in cluster.workers) {
				cluster.workers[wid].kill();
			}
			console.log("Stopped Server " + new Date());
			process.exit(0);
		break;
		
		default:
		break;
	}
})
exchange.on("listening", function() {
	var address = exchange.address();
	console.log("UDP bound: " + address.address + ":" + address.port + " on " + new Date());
});
exchange.bind(config.udpPort);

//////////////////////////////////////////////////////////////////////////////////
//																				//
//									CLUSTER SETUP								//
//																				//
//////////////////////////////////////////////////////////////////////////////////

cluster.setupMaster({
	exec	: "./sockpuppet.js",
	silent	: false
});

while(numCPUs--) {
	cluster.fork();
}

cluster
.on('fork', function(worker) {
})
.on('online', function(worker) {
})
.on('listening', function(worker, address) {

	var id 	= worker.uniqueID;
	var pid = worker.process.pid;
	
	console.log("Socket server pid::" + pid + " listening on port::" + config.socketPort);
	
	worker.on('message', function(msg, sock) {
	
		switch(msg.type) {
			case "error":
				console.log(msg.message);
			break;
			
			default:
				console.log("Unknown message sent from worker");
			break;
		}
		
	});
})
.on('exit', function(worker, code, signal) {
	console.log('Socket server pid::' + worker.process.pid + ' died');
})
.on('disconnect', function(worker, code, signal) {
	console.log('Socket server pid::' + worker.process.pid + ' disconnected');
})




