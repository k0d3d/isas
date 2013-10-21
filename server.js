/*
Module Dependencies
 */
var express = require('express');
var app = express();
var fs = require('fs');
var passport = require("passport"),
    mongoStore = require('connect-mongo')(express),
    flash = require('connect-flash'),
    helpers = require('view-helpers'),
    config = require('./config/config');

//Load configurations
//if test env, load example file
var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development',
    config = require('./config/config'),
    auth = require('./config/middlewares/authorization'),
    mongoose = require('mongoose');


//Bootstrap models
var models_path = __dirname + '/app/models';
fs.readdirSync(models_path).forEach(function(file) {
    require(models_path + '/' + file);
});

//bootstrap passport config
require('./config/passport')(passport);

app.set('showStackError', true);

//Enable jsonp
app.enable("jsonp callback");

app.use(express.logger());

//cookieParser should be above session
app.use(express.cookieParser());

//bodyParser should be above methodOverride
app.use(express.bodyParser());

app.use(express.methodOverride());

//express/mongo session storage
app.use(express.session({
    secret: 'hell12sex12fury',
    store: new mongoStore({
        url: config.db,
        collection: 'sessions'
    })
}));

//connect flash for flash messages
app.use(flash());

//dynamic helpers
app.use(helpers(config.app.name));

//use passport session
app.use(passport.initialize());
app.use(passport.session());

//CSRF protection for form-submission
//app.use(express.csrf());
app.use(function(req, res, next){
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  next();
});

//routes should be at the last
app.use(app.router);

//Assume "not found" in the error msgs is a 404. this is somewhat silly, but valid, you can do whatever you like, set properties, use instanceof etc.
app.use(function(err, req, res, next) {
    //Treat as 404
    if (~err.message.indexOf('not found')) return next();

    //Log it
    console.error(err.stack);

    //Error page
    res.json(500);
    console.log(err);
    // res.status(500).render('500', {
    //     error: err.stack
    // });
});

//Assume 404 since no middleware responded
app.use(function(req, res, next) {
    res.json(400, {});
    //next();
    // res.status(404).render('404', {
    //     url: req.originalUrl,
    //     error: 'Not found'
    // });
});

//Bootstrap routes
require('./config/routes')(app, passport, auth);

app.listen(3000);
console.log('IXIT File Server Started on port:'+ 3000);

//expose app
exports = module.exports = app;