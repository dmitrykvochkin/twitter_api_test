'use strict'


var twitter_util = require( '../util/twitter.js' );


/*
	add accounts to the queue
*/
exports.postAccounts = function(req, res){
  	
  	var users = (req.body.accounts_list || '').split(',');

  	console.log('postAccounts', users);

  	twitter_util.addUsers(users);


  	if(req.xhr){
		return res.status(200).json({
			'err': null,
			'msg': 'Processing ' + req.body.accounts_list + '...'
		});
  	}

  	return res.redirect('/');
};


exports.getAccounts = function(req, res){

	console.log('getAccounts', req.query.screen_name);
	if(!req.query.screen_name || req.query.screen_name.trim() == ''){
		return res.status(400).json({
			'err': 'Missing parameters!',
			'msg': ''
		});
	}


	twitter_util.getUserStats(req.query.screen_name, function(user){
		var msg = '';
		if(user){
			msg = 'Currently crawled '+user.followers_count+' followers from user - ' + user._id + '.'
		}else{
			msg = 'User "'+ req.query.screen_name +'" was not found.'
		}
		

		if(req.xhr){
			return res.status(200).json({
				'err': null,
				'msg': msg
			});
	  	}

  		return res.redirect('/');
	});

	
};

