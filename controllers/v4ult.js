var V4ult = require('../models/vault.js'),
    util = require('util'),
    _ = require('lodash'),
    cors = require('../lib/middlewares/cors');


module.exports.routes = function(app, redis_client, jobQueue){
  var v4ult = new V4ult(redis_client, jobQueue);

  // Handle uploads through flow.js
  app.post('/upload', cors, function(req, res, next){
    // return res.status(400).json(400);
    var fields = _.extend({}, req.body, req.headers, req.fields);

    //CORS Headers
    v4ult.postHandler(fields, req.files)
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

  app.options('/upload', cors, function(req, res){
    // res.header('Access-Control-Allow-Origin', '*');
    // res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.send(true, {
      // 'Access-Control-Allow-Origin': '*'
    }, 200);
  });


  // Handle status checks on chunks through flow.js
  app.get('/upload',cors, function(req, res){

    v4ult.getHandler(req.query, function(r){
      if(util.isError(r)){
        res.status(404).json(r);
      }else{
        res.status(200).json(r);
      }
    });
  });

};