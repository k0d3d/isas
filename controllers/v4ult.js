var V4ult = require('../models/vault.js'),
    util = require('util'),
    cors = require('../lib/middlewares/cors');


module.exports.routes = function(app){
  var v4ult = new V4ult();

  // Handle uploads through flow.js
  app.post('/upload', cors, function(req, res){
    var fields = req.body;
    var files = req.files;   
    //CORS Headers
    v4ult.postHandler(fields, files, function(status){
      console.log(status);
      //Send appoproiate response
      if(status === 1){
        res.json(200, {status: 'done'});
      }else if(status === 2){
        res.send(200, {status: 'inprogress'});
      }else{
        res.json(400, status);
      }
    });
  });

  // Handle cross-domain requests
  // NOTE: Uncomment this funciton to enable cross-domain request.

  app.options('/upload', function(req, res){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.send(true, {
      'Access-Control-Allow-Origin': '*'
    }, 200);
  });


  // Handle status checks on chunks through flow.js
  app.get('/upload',cors, function(req, res, next){

    v4ult.getHandler(req.param, function(r){
      if(util.isError(r)){
        res.json(404, r);
      }else{
        res.json(200, r);
      }
    });
  });
 
};