// var path = require('path'),
var fs = require('fs'),
    mime = require('mime');

module.exports = function(filePath, filename){
	return function(req, res, next){
        var mimetype = mime.lookup(filename);

        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', mimetype);

        var filestream = fs.createReadStream(filePath);
        filestream.pipe(res);
        next();
	};
};