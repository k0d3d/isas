/*
module requirements
 */
var formidable = require('formidable'),
    Filemanager = require('./file-manager.js');

module.exports = function () {
  return function (req, res, next) {
    var fm = new Filemanager();

    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
      // parse a file upload
      var form = new formidable.IncomingForm();
      form.uploadDir = fm.SYSTEMTEMPDIR;

      form.parse(req, function(err, fields, files) {
        req.body = fields;
        req.files = files;
        return next();
      });


    } else {
      next();
    }
  };
};