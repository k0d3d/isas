'use strict';
var Hawk = require('hawk');

var internals = {
    credentials: {
        dh37fgj492je: {
            id: 'dh37fgj492je',                                             // Required by Hawk.client.header
            key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
            algorithm: 'sha256',
            user: 'Steve'
        }
    }
};


// Credentials lookup function

var credentialsFunc = function (id, callback) {
    return callback(null, internals.credentials[id]);
};

module.exports = function () {
    // Hawk.sntp.start();
    return function (req, res, next) {
        Hawk.server.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                var headers = {
                    'Content-Type': 'text/plain',
                    'Server-Authorization': Hawk.server.header(credentials, artifacts, { payload: '', contentType: 'text/plain' })
                };
                // res.
                res.hawkheaders  = headers;
                req.payload = artifacts;
                next();
        });
    };
};