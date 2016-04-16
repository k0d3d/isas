/*
Upload Middleware. This streams the file from the http request body directly
into the "chunk store folder". It use busboy instead of formidable so there is
not unnecessry temporary files store on the OS.
 */
var Busboy = require('busboy'),
    fs = require('fs'),
    _ = require('lodash'),
    Filemanager = require('./file-manager.js');

module.exports = function () {
  return function (req, res, next) {

    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
      var fm = new Filemanager();

      req.fileProps = {};
      req.fields = {};
      var busboy = new Busboy({ headers: req.headers });
      busboy.on('file', function(fieldname, file, filename, encoding, mimeType) {

        file.on('data', function (data) {
          req.fields.fileSize = data.length;
        });

        // var saveTo = path.join(fm.APPCHUNKDIR, filename);
        var fields = _.extend({}, req.body, req.headers, req.fileProps);
        var fileParams = fm.setFields(fields);
        var saveTo = fm.getChunkFilePath(fileParams.chunkNumber, fm.vault_fileId(fileParams));
        req.fields = _.extend(fileParams, req.fields);
        req.fields.mimeType = mimeType;
        req.fields.identifier = fm.vault_fileId(fileParams);
        file.pipe(fs.createWriteStream(saveTo));
      });

      busboy.on('field', function(fieldname, val) {
        req.fileProps[fieldname] = val;
      });

      busboy.on('finish', function() {
        var validation = fm.validateRequest(req.fields.chunkNumber, req.fields.chunkSize, req.fields.totalSize, req.fields.identifier, req.fields.fileSize);
        if (validation !== 'valid') {
          return res.status(400).json({'status': 'Invalid Operation'});
        }
        return next();
      });

      return req.pipe(busboy);


    } else {
      next();
    }
  };
};