/**
 * Module dependcies
 */


/**
 * Expose routes
 */

module.exports = function (app, passport, auth) {

  var vault = require("./v4ult");
  vault.routes(app);
  
  var cabinet = require("./cabinet");
  cabinet.routes(app);

  // //Client Routes
  // var clients = require('./clients');
  // clients.routes(app, auth);

};