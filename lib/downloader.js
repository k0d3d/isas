var path = require('path'),
    fs = require('fs'),
    mime = require('mime');

module.exports = function(){
    return function(req, res, next){
        res.issueDownload = function(filePath, filename){
            var mimetype = mime.lookup(filename);

            //Check for an exisiting 
            //download session for this file

            res.setHeader('Content-disposition', 'attachment; filename=' + filename);
            res.setHeader('Content-type', mimetype);

            var filestream = fs.createReadStream(filePath);
            filestream.pipe(res);
        };
        next();
    };
};