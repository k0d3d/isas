/*
module requirements
 */
var formidable = require('formidable');

module.exports = function () {
  return function (req, res, next) {
    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
      // parse a file upload
      var form = new formidable.IncomingForm();

      form.uploadDir = process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/home/kingkoded/tmp' || process.cwd();

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