const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var mongo_util = require( './mongo.js' );
var ObjectId = require('mongodb').ObjectID;


passport.serializeUser((user, done) => {
	console.log('serializeUser', user);
	done(null, user._id);
});

passport.deserializeUser((id, done) => {
	var db = mongo_util.getDb();

	db.collection('users').findOne({
		_id: new ObjectId(id)
	}, (err, user) => {
		done(err, user);
	});

});





 /* 
 	Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: 'username' }, (username, password, done) => {
	var db = mongo_util.getDb();


	db.collection('users').findOne({
		'username': username,
		'password': password
	}, function(err, user){
		console.log('user found', err, user);
		if (err) { return done(err); }
		if (user) {
			return done(null, user);
		}
		return done(null, false, { msg: 'Invalid email or password.' });
	});

}));











module.exports.isAuthenticated = function(req, res, next){
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login');
};