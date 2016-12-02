var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


var homeController = require('./controllers/home.js');
var apiController = require('./controllers/api.js');


var passport = require('passport');
var app = express();


var passport_config = require('./util/passport');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(require('express-session')({ 
  secret: 'gameofthrones', 
  resave: true, 
  saveUninitialized: true 
}));
app.use(passport.initialize());
app.use(passport.session());



var mongoUtil = require( './util/mongo.js' );
mongoUtil.connectToServer( function( err ){
  if(err){
    console.log('*** ERROR *** - DB connection.');
    return process.exit(0);
  }
  console.log('Database is ready!');

  var twitter_util = require( './util/twitter.js' );
  twitter_util.init();
});









app.get('/', passport_config.isAuthenticated, homeController.index);

app.get('/login', homeController.getLogin);
app.post('/login', homeController.postLogin);

app.post('/api/accounts', passport_config.isAuthenticated, apiController.postAccounts);
app.get('/api/accounts', passport_config.isAuthenticated, apiController.getAccounts);






module.exports = app;
