var errors = require('errors'),
    fs = require('fs'),
    _ = require('lodash');


function createError (args) {
  errors.create(args);
}

module.exports.init = function () {
  errors.stacks(true);
  return function (req, res, next) {
    var jsondata = require('../config/errors.json');
    
    _.invoke(jsondata, createError);

    next(); 
  };
};

module.exports.nounce = function (errorType) {
  var e = errors[errorType];
  return new e().toString();
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