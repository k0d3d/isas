var fs = require('fs'),
    config = require("config"),
    path = require('path');

  function Utility(){

  }

  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }

  /**
   * Retrun a random int, used by `utils.uid()`
   *
   * @param {Number} min
   * @param {Number} max
   * @return {Number}
   * @api private
   */
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }    

  Utility.prototype.uuid = function(){
      return s4() + s4() + '-' + s4() + s4()+'-'+s4();
  };

  /**
   * Return a unique identifier with the given `len`.
   *
   *     utils.uid(10);
   *     // => "FDaS435D2z"
   *
   * @param {Number} len
   * @return {String}
   * @api private
   */
  Utility.uid = function(len) {
    var buf = [], 
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        charlen = chars.length;

    for (var i = 0; i < len; ++i) {
      buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
  };

  Utility.prototype.mediaNumber = function(){
    var milliseconds = (new Date()).getTime().toString();
    
    return parseInt(milliseconds.substring(2), 10);    
  };

  Utility.prototype.cleanIdentifier = function(identifier){
    return identifier;
  };  

module.exports = Utility;