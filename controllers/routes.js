/**
 * Module dependcies
 */
var
    jwt = require('jsonwebtoken'),
    hawk = require('../lib/hawk.js');


/**
 * Expose routes
 */

module.exports = function (app, redis_client, jobQueue) {

  var vault = require('./v4ult');
  vault.routes(app, redis_client, jobQueue, hawk);

  var cabinet = require('./cabinet');
  cabinet.routes(app, redis_client, jobQueue, hawk);


  app.post('/request-token', hawk(), function (req, res) {
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