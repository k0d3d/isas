var oauth2orize = require('oauth2orize'),
    passport = require('passport'),
    mongoose = require('mongoose'),
    utils = require('./utility'),
    RequestToken = mongoose.model('RequestToken'),
    AccessToken = mongoose.model('AccessToken'),
    OAuthClient = mongoose.model('OAuthClient'),
    debug = require('debug')('oauth2');

// create OAuth 2.0 server
var server = oauth2orize.createServer();

server.serializeClient(function (client, done) {
    return done(null, client._id);
});

server.deserializeClient(function (id, done) {
    OAuthClient.findOne({ _id: id }, function (error, client) {
        if (error) return done(error);
        return done(null, client);
    });
});

server.grant(oauth2orize.grant.code(function (client, redirectUri, user, ares, done) {
    debug('grant.code: client: %s, user: %s, redirectUri: %s', client, user, redirectUri);
    var code = utils.uid(16),
        doc = {
            code: code,
            user: user,
            client: client,
            redirectUri: redirectUri,
            created: new Date()
        };
    var token = new RequestToken(doc);
    token.save(function (error, result) {
        debug('grant.code: error: %s, result: %s', error, result);
        if (error) return done(error);
        done(null, code);
    });
}));

server.grant(oauth2orize.grant.token(function (client, user, ares, done) {
    debug('grant.token: client: %s, user: %s', client, user);
}));

server.exchange(oauth2orize.exchange.code(function (client, request_token, redirectUri, done) {
    debug('exchange.code: client: %s, request_token: %s', client, request_token);
    RequestToken.findOne({ client: client, code: request_token, redirectUri: redirectUri }, function (error, token) {
        debug('exchange.code: id: %s, request_token: %s, error: %s, token: %s', client._id, request_token, error, token);
        if (error) return done(error);
        if (!token) return done(null, false);
        var uid = utils.uid(256),
            doc = {
                token: uid,
                user: token.user,
                client: token.client,
                created: new Date()
            };
        var token = new AccessToken(doc);
        token.save(function (error, result) {
            debug('exchange.code: access_token: %s, error: %s', result, error);
            if (error) return done(error);
            done(null, uid);
        });
    });
}));

server.exchange(oauth2orize.exchange.password(function (client, username, password, scope, done) {
    debug('exchange.password: client: %s, username: %s, password: %s, scope: %s', client, username, password, scope);
}));

exports.authorization = server.authorization(function (clientKey, redirectUri, done) {
    debug('authorization: ', clientKey, redirectUri);
    OAuthClient.findOne({ clientKey: clientKey }, function (error, client) {
        debug('authorization: ', error, client);
        if (error) return done(error);
        return done(null, client, redirectUri);
    });
});

exports.dialog = function (req, res) {
    res.render('oauth/dialog', { title: 'Request for Access to Account', transactionId: req.oauth2.transactionID, user: req.user, oauth_client: req.oauth2.client, nomenu: true });
};

exports.token = [
    passport.authenticate([ 'basic', 'oauth2-client-password' ], { session: false }),
    server.token(),
    server.errorHandler({ mode: 'indirect' })
];

exports.server = server;
