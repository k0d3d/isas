var V4ult = require('../models/vault.js'),
    appConfig = require('config').express,
    util = require('util'),
    Filemanager = require('../lib/file-manager'),
    request = require('request'),
    _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    cors = require('cors'),
    userAuthd = require('../lib/middlewares/authorization');


module.exports.routes = function(app, redis_client, jobQueue){
  var v4ult = new V4ult(redis_client, jobQueue);

  //endpoint
  //
  app.post('/upload/automate', cors(appConfig.cors.options), function (req, res, next) {
    var filename = 'ixitbot-' + Date.now() + '-Image.jpg';
    var vault = new V4ult(redis_client, jobQueue);
    vault.postCompleteFileHandler(req.body)
    .then(function (file_result) {
      var pathToWrite = fs.createWriteStream(path.join(process.cwd(), 'storage', filename ));
      request(req.body.targetSrc).pipe(pathToWrite);
      res.json(file_result);
    }, function (err) {
      next(err);
    });
  });

  // Handle uploads through flow.js
  app.post('/upload', cors(appConfig.cors.options), userAuthd(redis_client), function(req, res, next){
  // app.post('/upload', cors(appConfig.cors.options), function(req, res, next){
    // return res.status(400).json(400);

    //Check if this upload requires multipart or chunking operation
    if (parseInt(req.fields._chunkNumber) === 1 && parseInt(req.fields._totalChunks) === 1 ) {
      v4ult.postOneChunkHandler(req.fields)
      .then(function(status){
        if (util.isError(status)) {
          return res.status(400).json(status);
        }
        res.status(200).json(status);
      }, function (err) {
        next(err);
      });
      return;
    }
    //CORS Headers
    v4ult.postMultipleChunkHandler(req.fields)
    .then(function(status){
      if (util.isError(status)) {
        return res.status(400).json(status);
      }
      res.status(200).json(status);
    }, function (err) {
      next(err);
    });
  });

  // Handle cross-domain requests
  // NOTE: Uncomment this funciton to enable cross-domain request.

  app.options('/upload', cors(appConfig.cors.options), userAuthd(redis_client), function(req, res){

    res.send(true, 200);
  });


  // Handle status checks on chunks through flow.js
  app.get('/upload',cors(appConfig.cors.options), userAuthd(redis_client), function(req, res){
    var fm = new Filemanager(req);
    var fields = _.extend({}, req.query, req.headers);
    v4ult.getHandler(fm.setFields(fields))
    .then(function(r){
        res.status(200).json(r);
    }, function (err) {
        res.status(404).json(err);
    });
  });

};