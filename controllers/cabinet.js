var CabinetObject = require('../models/media.js').cabinet,
    util = require('util'),
    _ = require('lodash'),
    hashr = require('../lib/hash.js');

module.exports.routes = function(app){
  var cabinet = new CabinetObject();

  //Request the home folderId
  app.get('/users/:userId/home', function(req,res, next){
    cabinet.findUserHome(req.param('userId'),
      function(r){
        if(util.isError(r)){
          next(r);
        }else{
          res.json(200, r);
        }
      });
  });

  //Request all files belonging to a user
  app.get('/users/:userId/files', function(req,res, next){
    var page = req.body.page || 0;
    var limit = req.body.limit || 10;
    cabinet.findUserFiles(req.param('userId'), {page: page, limit: limit},
      function(r){
        if(util.isError(r)){
          next(r);
        }else{
          res.json(200, r);
        }
      });
  });

  //Request for uncompleted uploads
  app.get('/users/:userId/queue', function(req, res, next){
    var page = req.body.page || 0;
    var limit = req.body.limit || 10;
    cabinet.findUserQueue(req.param('userId'), {page: page, limit: limit},
      function(r){
        if(util.isError(r)){
          next(r);
        }else{
          res.json(200, r);
        }
      });
  });

  //Request for a file to be served / downloaded
  app.get('/users/media/:mediaId', function(req, res){
    var mediaId = req.params.mediaId;
    cabinet.getFile(mediaId, function(r){
      if(util.isError(r) || _.isEmpty(r)){
        res.json(404, r);
      }else{
        res.json(200, r);
      }
    });
  });

  //Makes a search request
  app.get('/media/search/:query', function(req, res, next){
    cabinet.search(req.params.query, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  //Send the file to the browser to be downloaded
  app.get('/download/:mediaId', function(req, res, next){
    cabinet.serveFile(req.params.mediaId, function(r, filename){
      if(util.isError(r)){
        next(r);
      }else{
        res.issueDownload(r, filename);
      }
    });
  });

  //Shows the amount of diskspace and files uploaded by a user
  app.get('/users/:userId/media/count', function(req, res, next){
    cabinet.count(req.params.userId, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  //Request a folders content
  app.get('/users/:userId/folder', function(req, res, next){
    cabinet.openUserFolder(req.params.userId, req.query, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  //Creates a new folder and response wit the folder
  app.post('/users/:userId/folder', function(req, res, next){
    cabinet.createFolder({
      owner: req.params.userId,
      name: req.body.name,
      parent: req.body.parent,
      type: req.body.type
    }, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  //Updates tags belonging to a file
  app.put('/users/:userId/file/:fileId/tags', function(req, res, next){
    var tags = req.body.tags;
    var file_id = req.params.fileId;
    var owner = req.params.userId;
    cabinet.updateTags(file_id, owner, tags, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, true);
      }
    });
  });

  app.delete('/users/:userId/file/:fileId', function(req, res, next){
    var obj = {
      fileId: req.params.fileId,
      userId: req.params.userId,
      identifier: req.body.identifier
    };
    cabinet.deleteeteFileRecord(obj,  function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  //deletes a folder
  app.delete('/users/:userId/folder/:folderId', function(req, res, next){
    var obj = {
      folder_id: hashr.unhashOid(req.params.folderId),
      owner: req.params.userId
    };
    cabinet.deleteeteFolderRecord(obj,  function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  app.delete('/users/:userId/queue/:queueId', function(req, res, next){
    var userId = req.params.userId;
    var mediaNo = req.params.queueId;
    cabinet.unQueue(mediaNo, userId, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });
};