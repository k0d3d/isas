/**
 * Module dependcies
 */
var redis = require('redis'),
    jwt = require('jsonwebtoken');


/**
 * Expose routes
 */

module.exports = function (app) {

  var vault = require("./v4ult");
  vault.routes(app);

  var cabinet = require("./cabinet");
  cabinet.routes(app);


  app.post('/request-token', function (req, res, next) {
    console.log(req.body);
    //hash object using clientid
    var token = jwt.sign(req.body, req.body.clientId, {expiresInMinutes: 60});
    //store in redis
    //send response
    res.status(200).json(token);
  });

  // //Client Routes
  // var clients = require('./clients');
  // clients.routes(app, auth);

};