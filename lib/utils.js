var crypto 	= require('crypto');
var uuid 	= require('node-uuid');
var fs		= require('fs');

module.exports = new function() {

	this.createHash = function() {
		return crypto.createHash('sha256').update(uuid.v4() + Math.random()).digest('hex');
	};


	this.walkDir = function(dir, done, d) {
	
		var _this 	= this;
		var files 	= [];
		var dirs	= d || [];
		
		fs.readdir(dir, function(err, list) {
		
			if(err) {
				return done(err);
			}
			
			d && dirs.push(dir);
			
			var pending = list.length;
			if(!pending) {
				return done(null, files, dirs);
			}
			
			//  Sort alpha, asc
			//
			list.sort(function(a, b) {
                return a < b ? -1 : 1;
            }).forEach(function(file) {
            
				file = dir + '/' + file;
				fs.stat(file, function(err, stat) {
					if(stat && stat.isDirectory()) {
						_this.walkDir(file, function(err, res) {
							files = files.concat(res);
							if(!--pending) {
								done(null, files, dirs);
							}
						}, dirs);
					} else {
						files.push(file);
						if(!--pending) {
							done(null, files, dirs);
						}
					}
				});
			});
		});
	};
	
};