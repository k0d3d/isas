/*
Upload Middleware. This streams the file from the http request body directly
into the "chunk store folder". It use busboy instead of formidable so there is
not unnecessry temporary files store on the OS.
 */
var Busboy = require('busboy'),
    path = require('path'),
    fs = require('fs'),
    Filemanager = require('./file-manager.js');

module.exports = function () {
  return function (req, res, next) {
    var fm = new Filemanager();

    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
      // parse a file upload
      // var form = new formidable.IncomingForm();
      // form.uploadDir = fm.SYSTEMTEMPDIR;

      // form.parse(req, function(err, fields, files) {
      //   req.body = fields;
      //   req.files = files;
      //   return next();
      // });
      req.fields = {};
      var busboy = new Busboy({ headers: req.headers });
      busboy.on('file', function(fieldname, file, filename, encoding, mimeType) {
        var saveTo = path.join(fm.APPCHUNKDIR, filename);
        req.fields.mimeType = mimeType;
        file.pipe(fs.createWriteStream(saveTo));
      });

      busboy.on('field', function(fieldname, val) {
        req.fields[fieldname] = val;
      });

      busboy.on('finish', function() {
        next();
      });

      return req.pipe(busboy);


    } else {
      next();
    }
  };
};