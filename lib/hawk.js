'use strict';
var Hawk = require('hawk'),
    $c_ = require('./utility');

// Credentials lookup function

var credentialsFunc = function (id, callback) {
    var uid = $c_.randomString(256);
    var credentials = {
        key: uid,
        id: id,
        algorithm: 'sha256'
    };

    return callback(null, credentials);
};

module.exports = function () {
    // Hawk.sntp.start();
    return function (req, res, next) {
        Hawk.server.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

            // Prepare response
            var payload;
            if (['post', 'patch', 'put'].indexOf(req.method)) {
                payload = req.body;
            } else {
                payload = req.query;
            }

            // Generate Server-Authorization response header

            var header = Hawk.server.header(credentials, artifacts, { payload: payload, contentType: req.headers['Content-Type'] });
            req.headers['Server-Authorization'] = header;

            if (err) {
                return res.status(400).json(err);
            }

            // Send the response back
            next();
            // res.writeHead(!err ? 200 : 401, headers);
            // res.end(payload);
        });
    };
};