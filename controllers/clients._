/**
 * Module dependencies.
 */
 var mongoose = require('mongoose'),
 async = require('async'),
 util = require('util'),
 cors = require('../lib/middlewares/cors'),
 _ = require('underscore');



 function ClientsController (){

 }

 ClientsController.prototype.constructor = ClientsController;

/**
 * Find client by id
 */
 ClientsController.prototype.client = function(req, res, next, id) {
  OAuthClient.load(id, function(err, client) {
    if (err) return next(err);
    if (!client) return next(new Error('Failed to load client ' + id));
    req.client = client;
    next();
  });
};

/**
 * Create a client
 */
 ClientsController.prototype.create = function(rb, cb) {
  var client = new OAuthClient(rb);
  client.save(function(err, i){
    if(err) return cb(err);
    cb({
      clientKey: i.clientKey
    });
  });
};

/**
 * Update a client
 */
 ClientsController.prototype.update = function(req, res) {
  var client = req.client;

  client = _.extend(client, req.body);

  client.save(function(err) {
    res.jsonp(client);
  });
};

/**
 * Delete an client
 */
 ClientsController.prototype.destroy = function(req, res) {
  var client = req.client;

  client.remove(function(err) {
    if (err) {
      res.render('error', {
        status: 500
      });
    } else {
      res.jsonp(client);
    }
  });
};

/**
 * Show an client
 */
 ClientsController.prototype.show = function(req, res) {
  res.jsonp(req.client);
};

/**
 * List of OAuthClients
 */
 ClientsController.prototype.all = function(req, res) {
  OAuthClient.find().sort('-created').exec(function(err, clients) {
    if (err) {
      res.render('error', {
        status: 500
      });
    } else {
      res.jsonp(clients);
    }
  });
};

module.exports.clients = ClientsController;

var clients = new ClientsController();

module.exports.routes = function(app, auth){
  app.get('/clients', clients.all);

  app.post('/clients', cors, function(req, res, next){
    if(_.isUndefined(req.body.user)) return next(new Error('Bad Request'));
    clients.create(req.body, function(r){
      if (util.isError(r)) {
        next(r);
      } else {
        res.json(r);
      }
    });
  });

  app.post('/clients/session', function(req, res, next){
    res.json(200, req.body);
  });
  app.get('/clients/:clientId', clients.show);
  app.put('/clients/:clientId', auth.requiresLogin, auth.client.hasAuthorization, clients.update);
  app.del('/clients/:clientId', auth.requiresLogin, auth.client.hasAuthorization, clients.destroy);

  //Finish with setting up the clientId param
  app.param('clientId', clients.client);

};