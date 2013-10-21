var Utility = require('../../lib/utility.js');
var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Stream = require('stream').Stream,
    mongoose = require("mongoose"),
    Media = mongoose.model('Media');
    _ = require("underscore"); 


/*
Object Declaration
 */

function CabinetObject(){

}

CabinetObject.prototype.constructor = CabinetObject;

CabinetObject.prototype.findUserFiles = function(userId, options, callback){
	Media.userFiles(userId, options, function(i){
		callback(i);
	});
}

CabinetObject.prototype.findUserQueue = function(userId, options, callback){
	Media.userQueue(userId, options, function(i){
		callback(i);
	});
}

CabinetObject.prototype.countUserFiles = function(userId, callback){
	Media.countUserFiles(userId, function(count){
		callback(count);
	});
}

module.exports.cabinet =  CabinetObject;

var cabinet = new CabinetObject();


module.exports.routes = function(app){
	app.get("/user", function(req, res){
		res.json(200, {"hello": "hi"});
	})

	app.get('/user/:userId/files', function(req,res, next){
		var page = req.body.page || 0;
		var limit = req.body.limit || 10;
		cabinet.findUserFiles(req.param('userId'), {page: page, limit: limit},
			function(r){
				if(util.isError(r)) next(r);
				res.json(200, r);
			});
	});

	app.get('/user/:userId/queue', function(req, res, next){
		var page = req.body.page || 0;
		var limit = req.body.limit || 10;
		cabinet.findUserQueue(req.param('userId'), {page: page, limit: limit},
			function(r){
				if(util.isError(r)) next(r);
				res.json(200, r);
			});
	});
}