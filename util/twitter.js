'use strict'

var mongo_util = require( '../util/mongo.js' );

var Twitter = require('twitter');
var OAuth = require('oauth');

var config = {
	key: '****',
	secret: ''****',',
	ttl_time: 1000*60*60*24*7 //crawl data older than 1 week
};


var request = require("request");



var client = new Twitter({
  consumer_key: config.key,
  consumer_secret: config.secret
});



var this_util;

	

module.exports = {

	init: function(){
		if(!this_util){
			this_util = new TwitterUtil();
		}
	},

	addUsers: function(user_arr){
		if(!this_util){
			this.init();
		}

		for(var u in user_arr){
			this_util.addUserToQueue(user_arr[u].trim());
		}
		
	},


	getUserStats: function(screen_name, callback){
		if(!this_util){
			this.init();
		}
	
		this_util.getUserStats(screen_name, callback);
	}


};












function TwitterUtil(db){
	var _this = this;

	_this.users_to_process = [];

	_this.request_available = 15;
	setInterval(function(){
		console.log('\n\n *** Refresh requests *** \n');
		_this.request_available = 15;
	}, 1000*60*15);



	setInterval(function(){

		if(_this.request_available>0){
			_this.processNextUser();
		}

	}, 1000*10);
};


TwitterUtil.prototype = {

	addUserToQueue: function(name){
		//check if user is on DB
		var db = mongo_util.getDb();
		var _this = this;

		db.collection('twitter_users').findOne({'screen_name': name}, function(err, result){
			if(err){
				console.log('*** ERROR: db.twitter_users.findOne()');
				return;
			}

			if(result){
				//console.log('user was already processed, check ttl');
				if(result.last_update 
					&& result.last_update > (new Date().getTime()) - config.ttl_time ){
					return;
				}

				//clean followers array	
				db.collection('twitter_users').update({'screen_name': name}, 
					{$set: { followers: [] }}, function(err, result){
						if(err){
							console.log('*** ERROR - when cleaning followers array', err);
						}
					});
			}


			_this.users_to_process.push({
				'screen_name': name,
				'followers': [],
				'cursor': -1
			});
		});

		
	},


	processNextUser: function(){
		console.log('processNextUser', this.users_to_process.length, this.request_available);
		var _this = this;
		if(_this.users_to_process.length <= 0 || _this.request_available <= 0){
			return;
		}

		var user_to_process = _this.users_to_process.shift();

		

		_this.request_available--;
		getUserFollowers(user_to_process.screen_name, (user_to_process.cursor || -1), function(repeat_user, rate_exceded){
			console.log('repeat_user', repeat_user);
			if(repeat_user){ 

			//users with more that 5k get parsed again, 
			//but only after going through the whole array to make users with small amount of
			//followers a priority
				_this.users_to_process.push(repeat_user);
			}

			if(rate_exceded){
				_this.request_available = 0;
			}

		});
	},




	getUserStats: function(screen_name, callback){
		var db = mongo_util.getDb();
		var _this = this;


		db.collection('twitter_users').aggregate([
		  {$match: {'screen_name': screen_name}}, 
		  {$unwind: "$followers"},
		  {$project: 	{'screen_name': '$screen_name', count:{$add:1}}},
		  {$group: {_id: '$screen_name', followers_count: {$sum: "$count" }}}
		], function(err, result){
			if(err){
				console.log('*** ERROR: db.twitter_users.findOne()', err);
			}

			console.log('\n\n getUser result', result);
			return callback(result[0]);
		});


	}

};












//https://api.twitter.com/1.1/followers/ids.json?cursor=-1&screen_name=andypiper&count=5000
function getUserFollowers(name, cursor, callback){
	console.log('\n\n\n\n getUserFollowers', arguments);
	var url = 'https://api.twitter.com/1.1/followers/ids.json?';
	var bearerToken = config.bearer_token; //the bearer token obtained from the last script

	request({ url: url,
	    method:'GET',
	    qs:{ 'screen_name': name, 'cursor': cursor, 'count': 5000 },
	    json:true,
	    headers: {
	        "Authorization": "Bearer " + bearerToken
	    }

	}, function(err, response, body) {
		if (err || (body.errors && body.errors.length>0) || response.statusCode == 401) {
			console.log('\n *** ERROR - getUserFollowers ', response.statusCode, err);

			if(response.statusCode == 401){
				return requestBearerToken(function(err){
					if(err){
						return callback();
					}
					return getUserFollowers(name, cursor, callback);
				});
			}else if(body.errors && body.errors.length>0 && body.errors[0].code == 88){
				//Rate limit exceeded
				return callback({
					'screen_name': name, 'cursor': cursor
				}, true);
			}

			return callback({
				'screen_name': name, 'cursor': cursor
			});
		}

		console.log('getUserFollowers', body.ids ? body.ids.length : body);

		if(body.ids && body.ids.length>0){
			updateUserToDb(name, body.ids); //no need to w8 for callback
		}

		
		var repeat_user = (!body.next_cursor || body.next_cursor<=0) ? false : {
			'screen_name': name, 'cursor': body.next_cursor
		};
		return callback(repeat_user);

	});
};










function requestBearerToken(callback){
	
	var aux = config.key + ":" + config.secret;
	var credentials = new Buffer(aux).toString('base64');

	var url = 'https://api.twitter.com/oauth2/token';

	request({ url: url,
	    method:'POST',
	    headers: {
	        "Authorization": "Basic " + credentials,
	        "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"
	    },
	    body: "grant_type=client_credentials",
	    json:true

	}, function(err, resp, body) {
		console.log('*** ERROR requestBearerToken ', err);
		config.bearer_token = body.access_token;
		return callback(err);	    
	});

};







function updateUserToDb(screen_name, followers){
	var db = mongo_util.getDb();

	db.collection('twitter_users').update({
		'screen_name': screen_name
	}, {
		'$push': { 'followers': { $each: followers } },
		'$set': {
			'last_update': (new Date().getTime())
		}
	},{
		'upsert': true
	}, function(err, result){
		if(err){
			console.log('*** ERROR - updateUserToDb() ', err);
		}
	});

};









