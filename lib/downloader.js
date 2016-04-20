// var path = require('path'),
var fs = require('fs');
    // mime = require('mime');

module.exports = function(){
    return function(req, res, next){
        res.issueDownload = function(filePath, filename){
            // var mimetype = mime.lookup(filename);

            //Check for an exisiting
            //download session for this file
            var fsize = fs.statSync(filePath).size || 0;

            res.setHeader('Content-Description', 'iXit File Transfer');
            res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Length', fsize);
            res.setHeader('Content-Transfer-Encoding', 'binary');
            res.setHeader('Accept-Ranges',  'bytes');
            var filestream = fs.createReadStream(filePath);
            filestream.pipe(res);
        };
        next();
    };
};