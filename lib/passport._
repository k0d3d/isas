var mongoose = require('mongoose'),
    LocalStrategy = require('passport-local').Strategy,
    TwitterStrategy = require('passport-twitter').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    GitHubStrategy = require('passport-github').Strategy,
    GoogleStrategy = require('passport-google-oauth').Strategy,
    BasicStrategy = require('passport-http').BasicStrategy,
    ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    User = require('../models/user.js');
    // AccessToken = mongoose.model('AccessToken'),
    // RequestToken = mongoose.model('RequestToken'),
    // OAuthClient = mongoose.model('OAuthClient');

module.exports = function(passport, config) {

    // Simple route middleware to ensure user is authenticated.  Otherwise send to login page.
    passport.ensureAuthenticated = function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) { return next(); }
      res.redirect('/login');
    };
     
    // Check for admin middleware, this is unrelated to passport.js
    // You can delete this if you use different method to check for admins or don't need admins
    passport.ensureAdmin = function ensureAdmin(req, res, next) {
            if(req.user && req.user.admin === true)
                next();
            else
                res.send(403);
    };


    //Serialize sessions
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        Client.findOne({
            _id: id
        }, function(err, user) {
            done(err, user);
        });
    });

    //Use local strategy
    passport.use(new LocalStrategy({
            usernameField: 'email',
            passwordField: 'password'
        },
        function(email, password, done) {
            Client.findOne({
                email: email
            }, function(err, user) {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    return done(null, false, {
                        message: 'Unknown user'
                    });
                }
                if (!user.authenticate(password)) {
                    return done(null, false, {
                        message: 'Invalid password'
                    });
                }
                return done(null, user);
            });
        }
    ));


    // // Use basic strategy for OAuth
    // passport.use(new BasicStrategy(function (clientKey, clientSecret, done) {
    //     debug('BaS: clientKey: %s, clientSecret: %s', clientKey, clientSecret);
    //     OAuthClient.findOne({ clientKey: clientKey, clientSecret: clientSecret }, function (err, client) {
    //         debug('BaS: clientKey: %s, clientToken: %s, err: %s, client: %s', clientKey, clientSecret, err, client);
    //         if (err) return done(err);
    //         if (!client) return done(null, false);
    //         return done(null, client);
    //     });
    // }));

    // // Use client password strategy for OAuth2 clients
    // passport.use(new ClientPasswordStrategy(function (clientKey, clientToken, done) {
    //     debug('CPS: key: %s, token: %s', clientKey, clientToken);
    //     OAuthClient.findOne({ clientKey: clientKey, clientSecret: clientToken }, function (err, client) {
    //         debug('CPS: client: %s, err: %s', client, err);
    //         if (err) return done(err);
    //         if (!client) return done(null, false);
    //         return done(null, client);
    //     });
    // }));

    // // Use bearer strategy
    // passport.use(new BearerStrategy(function (accessToken, done) {
    //     debug('BeS: accessToken: %s', accessToken);
    //     AccessToken.findOne({ token: accessToken }, function (err, token) {
    //         if (err) return done(err);
    //         if (!token) return done(null, false);
    //         debug('BeS: user_id: %s', token.user_id);
    //         User.findOne({ _id: token.user_id }, function (err, user) {
    //             debug('BeS: user: %s, err: %s', user, err);
    //             if (err) return done(err);
    //             if (!user) return done(null, false);
    //             return done(null, user);
    //         });
    //     });
    // }));    

    // //Use twitter strategy
    // passport.use(new TwitterStrategy({
    //         consumerKey: config.twitter.clientID,
    //         consumerSecret: config.twitter.clientSecret,
    //         callbackURL: config.twitter.callbackURL
    //     },
    //     function(token, tokenSecret, profile, done) {
    //         Client.findOne({
    //             'twitter.id_str': profile.id
    //         }, function(err, user) {
    //             if (err) {
    //                 return done(err);
    //             }
    //             if (!user) {
    //                 user = new User({
    //                     name: profile.displayName,
    //                     username: profile.username,
    //                     provider: 'twitter',
    //                     twitter: profile._json
    //                 });
    //                 user.save(function(err) {
    //                     if (err) console.log(err);
    //                     return done(err, user);
    //                 });
    //             } else {
    //                 return done(err, user);
    //             }
    //         });
    //     }
    // ));

    // //Use facebook strategy
    // passport.use(new FacebookStrategy({
    //         clientID: config.facebook.clientID,
    //         clientSecret: config.facebook.clientSecret,
    //         callbackURL: config.facebook.callbackURL
    //     },
    //     function(accessToken, refreshToken, profile, done) {
    //         Client.findOne({
    //             'facebook.id': profile.id
    //         }, function(err, user) {
    //             if (err) {
    //                 return done(err);
    //             }
    //             if (!user) {
    //                 user = new User({
    //                     name: profile.displayName,
    //                     email: profile.emails[0].value,
    //                     username: profile.username,
    //                     provider: 'facebook',
    //                     facebook: profile._json
    //                 });
    //                 user.save(function(err) {
    //                     if (err) console.log(err);
    //                     return done(err, user);
    //                 });
    //             } else {
    //                 return done(err, user);
    //             }
    //         });
    //     }
    // ));

    // //Use github strategy
    // passport.use(new GitHubStrategy({
    //         clientID: config.github.clientID,
    //         clientSecret: config.github.clientSecret,
    //         callbackURL: config.github.callbackURL
    //     },
    //     function(accessToken, refreshToken, profile, done) {
    //         Client.findOne({
    //             'github.id': profile.id
    //         }, function(err, user) {
    //             if (!user) {
    //                 user = new User({
    //                     name: profile.displayName,
    //                     email: profile.emails[0].value,
    //                     username: profile.username,
    //                     provider: 'github',
    //                     github: profile._json
    //                 });
    //                 user.save(function(err) {
    //                     if (err) console.log(err);
    //                     return done(err, user);
    //                 });
    //             } else {
    //                 return done(err, user);
    //             }
    //         });
    //     }
    // ));

    // //Use google strategy
    // passport.use(new GoogleStrategy({
    //         consumerKey: config.google.clientID,
    //         consumerSecret: config.google.clientSecret,
    //         callbackURL: config.google.callbackURL
    //     },
    //     function(accessToken, refreshToken, profile, done) {
    //         Client.findOne({
    //             'google.id': profile.id
    //         }, function(err, user) {
    //             if (!user) {
    //                 user = new User({
    //                     name: profile.displayName,
    //                     email: profile.emails[0].value,
    //                     username: profile.username,
    //                     provider: 'google',
    //                     google: profile._json
    //                 });
    //                 user.save(function(err) {
    //                     if (err) console.log(err);
    //                     return done(err, user);
    //                 });
    //             } else {
    //                 return done(err, user);
    //             }
    //         });
    //     }
    // ));
};