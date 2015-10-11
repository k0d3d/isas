var V4ult = require('../models/vault.js'),
    util = require('util'),
    Filemanager = require('../lib/file-manager'),
    _ = require('lodash'),
    cors = require('../lib/middlewares/cors'),
    userAuthd = require('../lib/middlewares/authorization');


module.exports.routes = function(app, redis_client, jobQueue, s3client){
  var v4ult = new V4ult(redis_client, jobQueue, s3client);

  // Handle uploads through flow.js
  app.post('/upload', cors(), userAuthd(redis_client), function(req, res, next){
  // app.post('/upload', cors(), function(req, res, next){
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

  app.options('/upload', cors(), userAuthd(redis_client), function(req, res){
    // res.header('Access-Control-Allow-Origin', '*');
    // res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.send(true, {
      // 'Access-Control-Allow-Origin': '*'
    }, 200);
  });


  // Handle status checks on chunks through flow.js
  app.get('/upload',cors(), userAuthd(redis_client), function(req, res){
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