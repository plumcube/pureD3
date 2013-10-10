module.exports = {

	'/test' : function(dat, next) {
		console.log("TEST");
		console.log(dat);
		next();
	}
}