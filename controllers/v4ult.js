var V4ult = require('../models/vault.js'),
    util = require('util'),
    _ = require('lodash'),
    cors = require('../lib/middlewares/cors');


module.exports.routes = function(app){
  var v4ult = new V4ult();

  // Handle uploads through flow.js
  app.post('/upload', cors, function(req, res){
    // return res.status(400).json(400);
    var fields = _.extend({}, req.body, req.headers);
    var files = req.files;
    //CORS Headers
    v4ult.postHandler(fields, files, function(status){
      if (util.isError(status)) {
        return res.status(500).json(status);
      }
      //Send appoproiate response
      if(typeof status === 'object'){
        res.status(200).json(_.pick(status, ['ixid', 'type']));
      }else if(status === 2){
        res.send(200, {status: 'inprogress'});
      }else{
        res.status(400).json(status);
      }
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