

/**
 * Expose routes
 */

module.exports = function (app, passport) {

  var vault = require("../app/controllers/v4ult");
  vault.routes(app);
  
  var cabinet = require("../app/controllers/cabinet");
  cabinet.routes(app);
}