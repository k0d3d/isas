var request = require('request'),
    url = require('url'),
    _ = require('lodash'),
    debug = require('debug')('dkeep'),
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
      var xAuthr = req.body['x-Authr'];
      redis_client.hgetall(xAuthr, function (err, userHash) {

        if (!err && userHash) {
          return next();
        }
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

            if (compareAuth(resBodyJSON, xAuthr)) {
              redis_client.hmset(xAuthr, resBodyJSON, function () {
                next();
              });
              redis_client.expire(xAuthr, 10);
            } else {
              res.status(401).json({status: 'Unauthorized'});
            }
          } else {
            res.status(401).json({status: 'Unauthorized'});
          }
        });
      });
    };
};