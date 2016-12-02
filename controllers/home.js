'use strict'
var passport = require('passport');
var mongo_util = require( '../util/mongo.js' );


exports.index = function(req, res){
  res.render('index', {
  	
  });
};


exports.getLogin = function(req, res){
	res.render('login', {
  	
  });
};




exports.postLogin = function(req, res, next){
	if (req.user) {
		return res.redirect('/');
	}

	var db = mongo_util	.getDb();



	passport.authenticate('local', function(err, user, info){
	    if (err) { return next(err); }
	    if (!user) {
	      console.log(' *** ERROR', err);
	      return res.redirect('/login');
	    }
	    req.logIn(user, function(err){
	      if (err) { return next(err); }
	      res.redirect('/');
	    });
	})(req, res, next);


};
