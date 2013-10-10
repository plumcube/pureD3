var utils 	= require('./utils.js');
var fs		= require('fs');
var jade	= require('jade');
var util	= require('util');
var events	= require('events');

var Api = function() {};
util.inherits(Api, events.EventEmitter);

var api = new Api;

var compiledViews = {};

//	Given a view name (eg. "/box-plot") return a function that will
//	pack up and return an object containing all 
var linkView = function(name) {
	return function(payload, cb) {
		
		var cname = compiledViews[name];
		var pack = {
			data : {}
		};
		var cnt = 0;
		var data;
		var ds;
		var df;
		var p;
		
		var send = function() {
			pack.html	= cname['html'] ? cname['html']({scope: payload}, "utf-8") : null;
			pack.css	= cname['css'] || null;
			pack.js		= cname['js'] || null;

			cb(null, pack);
		};

		payload = typeof payload === "object" ? payload : {};

		if(!cname) {
			return cb("NOT_FOUND", {});
		}

		data = payload.data;

		if(!data) {
			return send();
		}
	
		if(df = data.files) {
			pack.data.files = {};
			return utils.walkDir(cname.path, function(err, files, dirs) {
				var flighted = 0;
				(util.isArray(df) ? df : [df]).forEach(function(p) {
					var path = cname.path + p;
					if(files.indexOf(path) > -1) {
						++flighted;
						return fs.readFile(path, function(err, fdat) {
							if(!err) {
								pack.data.files[p] = fdat.toString();
							} 
							!(--flighted) && send();
						});
					}
				});
			});
		} 
		
		if(ds = data.services) {
			for(p in ds) {
				if(api[p]) {
					++cnt;
					api[p](ds[p], function(res) {
						!(--cnt) && send();
					});
				}
			}
			send();
		}
	}
}

var done = new function() {
	var marks = 2;
	this.flag = function() {
		!(--marks) && api.emit("ready", api);
	}
};

//	Walk the /views directory and front-load found view objects,
//	simultaneously creating services to access those objects,
//	keyed by directory name within /views. Jade files compiled
//	and stored within this object as well.
//
utils.walkDir('./views', function(err, list, dirs) {
	
	var flighted = 0;
	
	var fin = function() {
		if(--flighted < 1) {
			done.flag();	
		}
	};

	dirs.forEach(function(d) {
		var key;
		list.forEach(function(f) {
			if(f.indexOf(d) === 0) {
				var fname = f.substring(f.lastIndexOf("/"));
				++flighted;
				fs.readFile(f, 'utf8', function(err, contents) {
					if(err) {
						console.log("Bad file in /views directory: " + f);
						return fin();
					}
					
					key = d.substring(d.lastIndexOf("/"));
					
					compiledViews[key] = compiledViews[key] || {
						html	: "",
						js		: "",
						css		: ""
					};
					
					api[key] = linkView(key);
					
					compiledViews[key]['path'] = d;
					
					if(fname.indexOf(".jade") > 0) {
						compiledViews[key]['html'] = jade.compile(contents);
					} else if(fname.indexOf(".js") > 0) {
						compiledViews[key]['js'] += contents;
					} else if(fname.indexOf(".css") > 0) {
						compiledViews[key]['css'] += contents;
					}
					
					fin();
				});
			}
		});
	});
});

utils.walkDir("./services", function(err, files) {
	files.forEach(function(f) {
		//	Require is on a different path, so move back one dir.
		//
		var s = require("." + f);
		var p;
		
		for(p in s) {
			api[p] = s[p];
		}
	});
	done.flag();
});

module.exports = api;

