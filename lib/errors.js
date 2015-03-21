var errors = require('errors'),
    _ = require('lodash');


function createError () {
  errors.create(this);
}

module.exports.init = function () {
  var jsondata = require('../config/errors.json');
  _.invoke(jsondata, createError);
  return function (req, res, next) {
    next();
  };
};

module.exports.nounce = function (errorType, showStack) {
  errors.stacks(true);
  // errors.stacks(showStack || false);
  var E = errors[errorType];
  return new E();
  // return new e().toString();
};


/**
 * creates a new error using a http response
 * status code as an argument
 * @param  {Number | String} statusCode http response status code
 * @param {string} message optional message
 * @return {object}            error object
 */
module.exports.httpError = function httpError (statusCode, message) {
  var code = 'Http' + statusCode + 'Error';
  return new errors[code](message);
};