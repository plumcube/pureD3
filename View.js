window.View = new function() {
			
	//	This can be used to store the last operation, a poor man's buffer.
	//
	this.$$ = {};
	
	//	Calls are simply incrementing from this seed
	//
	var callId 	= 1001;
	
	var flighted 		= {};
	var lastSweepId 	= 0;
	var sweepFreq		= 100;
	var flightMaxTime	= 2000; // ms
	var sessionId		= null;
	var socketRef;

	var send = function(sig) {
	
		var id = ++callId;
		
		(id - lastSweepId) > sweepFreq && sweep();
		
		flighted[id] = {
			scope : sig[3],
			start : new Date().getTime()
		};
		
		sig[1] = id;
	
		socketRef.send(JSON.stringify(sig));
	};
	
	//	Start flighted data sweep timer.
	//	@see #flightMaxTime for max TTL of any request.
	//		
	var sweep = function() {

		var now = new Date().getTime();
		var p;
		
		for(p in flighted) {
			if((now - flighted[p].start) > flightMaxTime) {
				delete flighted[p];
			}
		}
		
		lastSweepId = callId;
	};

	this.show = function(view, scope) {
	
		scope = scope || {};
		scope.sessionId = sessionId;
		
		//	Note that [1] === callId, and is set in #send
		//
		send([
			2,
			0,
			view,
			scope
		]);
	};
	
	this.importJS = function(scope) {
	
		code = scope.js;

		//	Only accept code in strict mode, asserted exactly at the top of the page.
		//
		if(!code || code.indexOf("use strict") !== 1) {
			return;
		}
		
		this.$$ = scope || {};

		var script = document.createElement("script");

		script.text = "(function($scope) {" + code + "})(View.$$)";
		document.head.appendChild(script);//.parentNode.removeChild(script);
		
		//	Clear the buffer
		//
		this.$$ = {};
	};
	
	this.importCSS = function(css) {
		var head 	= document.getElementsByTagName('head')[0] ;
		var el		= document.createElement('style');
		el.type		= 'text/css';
		el.appendChild(document.createTextNode(css));
		head.appendChild(el);
	};
	
	this.open = function(url, port, initCb) {
		
		socketRef = new WebSocket('ws://' + url + ":" + port, ["json"]);
		
		socketRef.onopen = function() {
			console.log("Socket open");
		};
		socketRef.onmessage = function(msg) {
			if(typeof msg !== "object" || !msg.data) {
				return;
			}
			
			var data = JSON.parse(msg.data);
			
			var typeId 	= data[0];
			var callId 	= data[1];
			var result	= data[2];
			var p;
			var ins;
			
			var callOb = flighted[callId];

			if(callOb) {
				result.selector = callOb.scope.selector;
				result.ready = callOb.scope.ready || function(){};
				result.view = result.selector ? document.querySelector(result.selector) : null;
			} 
			
			//	WAMP call type ID
			//	@see	http://wamp.ws/spec
			//
			switch(typeId) {
			
				case 0:

					//	On init handshake we get the #sessionId
					//
					sessionId = sessionId || callId;
			
					initCb && initCb();
					
				break;
			
				case 3: 

					result.css 	&& View.importCSS(result.css);
					
					if(result.html) {
						if(result.selector) {
							document.querySelector(result.selector).innerHTML = result.html;
						} else {
							ins = document.createElement("div");
							ins.innerHTML = result.html;
							document.body.appendChild(ins);
						}
					}
					
					result.js 	&& View.importJS(result);
					
					result.js = result.html = result.css = null;

					result.ready && result.ready();
				
				break;
				
				case 4:
					console.log("Call error --> ");
					console.log(data);
				break;
				
				default:
				break;
			}
			
		};
		socketRef.onerror = function(err) {
			console.log("Socket error!");
			console.log(arguments);
		};
	};
};
