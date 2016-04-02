var request = require('request'),
    url = require('url'),
    _ = require('lodash'),
    debug = require('debug')('dkeep'),
    iron = require('iron'),
    errors = require('../errors'),
    config =  require('config');

function compareAuth (resBody, reqUserId) {
  return resBody._id === reqUserId;
}
module.exports = function (redis_client) {
    return function (req, res, next) {
      debug('auth middleware');
      //should check if there's a valid
      //access token for this request on
      //redis. If there is, proceed with
      //operation. If there isnt or token
      //has expired, should request and store
      //the token on success or handle the error
      var xAuthr = req.get('x-authr');
      if (!xAuthr || xAuthr === 'undefined') {
        return res.status(401).json({status: 'Unauthorized'});
//         return next();
      }
      redis_client.hgetall('xAuthr', function (err, userHash) {
        //if an error , just halt the whole process
        if (err) {
          return errors.nounce('CriticalServerError');
        }
        //TODO: this should call the next middleware if
        //no errors are found and a valid session token is
        //found for an anonymous / visitor upload.
        if (!err && userHash) {
          return next();
        }
        if (!err && !userHash) {
          request.get({
            url: url.format(_.extend(config.api_server, {pathname: '/api/v2/users'})),
            headers: {
              'Authorization' : req.get('Authorization')
            }

          }, function (err, resp, resBody) {
            if (err) {
              return res.status(400).json(err);
            }
            if (resp.statusCode === 200 && resBody) {
              // in the response body from the request.
              // match the userid . the store successful
              // match in redis with an expiry date.
              var resBodyJSON = JSON.parse(resBody);
              if (!resBodyJSON) return res.status(400);
              //checking for a sealed public user object
              if (resBodyJSON.s) {
                //check for the user agent.
                var ua = req.useragent || false;
                if (!ua) {
                  return next(errors.nounce('ClientIdError'));
                }
                iron.seal(ua, resBodyJSON.i, iron.defaults, function (err, sealed) {
                  if (sealed === resBodyJSON.s) {
                    return next();
                  }

                  redis_client.hmset(session_id, {
                    s: sealed,
                    i: gen_uuid
                  });
                  redis_client.expires(session_id, 1800);
                  return res.status(200).send(session_id.sealed);
                });
              }
              if (compareAuth(resBodyJSON, xAuthr)) {
                redis_client.hmset('xAuthr', resBodyJSON, function () {
                  next();
                });
                redis_client.expire(xAuthr, 3600);
              } else {
                res.status(401).json({status: 'Unauthorized'});
              }
            } else {
              res.status(401).json({status: 'Unauthorized'});
            }
          });
        }
      });
    };
};