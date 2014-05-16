var Utility = require('../lib/utility.js');
var fs = require('fs'),
path = require('path'),
util = require('util'),
Stream = require('stream').Stream,
mongoose = require("mongoose"),
Media = mongoose.model('Media'),
Folder = mongoose.model('Folder'),
EventRegister = require('../lib/event_register').register,
_ = require("underscore"),
config = require('config'),
errors = require('../lib/errors.js').nounce,
Q = require('q'),
V4ult = require("./v4ult").v4ult;



/*
Object Declaration
*/

function CabinetObject(){

}

CabinetObject.prototype.constructor = CabinetObject;

/**
 * Returns the properties of the folder queried
 * @return {[type]} [description]
 */
CabinetObject.prototype.requestFolderProps = function requestFolderProps (userId, id) {
  var re = Q.defer();

  Folder.findOne({
    owner: userId,
    _id: id
  })
  .exec(function (err, i) {
    if (err) {
      return re.reject(err);
    } else {
      return re.resolve(i.toJSON());
    }
  });
  return re.promise;
};

/**
 * find files belonging to a certain user. An optional
 * options argument can be passed through to filter
 * the results. 
 * @param  {[type]}   userId   [description]
 * @param  {object}   options  Query parameters to filter results. 
 * 'id' here is the folderId used for this query.
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
 CabinetObject.prototype.findUserFiles = function findUserFiles (userId, options, callback){

  Media.userFiles(userId, options, function(i){
    if(i.length === 0){
      callback({});
    }else{
      callback(i);
    }
  });
};

/**
 * Fetches the content of a folder. This looks for all files
 * beloning to that folder, then all sub-folders within that folder.
 * @param  {[type]}   userId  [description]
 * @param  {[type]}   options [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 */
CabinetObject.prototype.openUserFolder = function openUserFolder (userId, options, cb){
  //Event Register Instance
  var register = new EventRegister();

  //Our container object for the queried folder
  var folder = {};

  var self = this;
  register.once('requestFolder', function(data, isDone){
    self.requestFolderProps(userId, options.id)
    .then(function(r){
      folder.props = r;
      isDone(data);

    })
    .catch(function (err) {
      isDone(data);
    });
  });

  register.once('fetchFiles', function(data, isDone){
    self.findUserFiles(userId, {folder: options.id}, function(r){
      if(_.isEmpty(r)){
        isDone(data);
      }else{
        folder.files = r;
        isDone(data);
      }
    });
  });

  register.once('fetchFolders', function(data, isDone){
    self.findSubFolder(userId, data, function(r){
      if(_.isEmpty(r)){
        folder.folders = [];
        isDone(data);
      }else{
        folder.folders = r;
        isDone(data);
      }      
    });
  });
  


  register
  .queue('requestFolder', 'fetchFiles', 'fetchFolders')
  .onError(function(err){
    cb(err);
  })
  .onEnd(function(r){
    cb(folder);
  })
  .start(options);
};

/**
 * Fetches all folders belonging to a user. 
 * Filtered by folders that are subfolders of the folder being 
 * queried. Using the parent property.
 * @param  {[type]}   userId  [description]
 * @param  {Object}   options Object containing the id and the parentid propterty
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 */
CabinetObject.prototype.findSubFolder = function(userId, options, cb){
  Folder.find({
    //Parent is the id of the folder being 
    //queried. Shows the heirachial relationship. 
    parent: options.id,
    owner: userId
  })
  //.where('parent', options.parentId)
  .exec(function(err, i){
    if(err){
      cb(err);
    }else{
      cb(i);
    }
  });
};

CabinetObject.prototype.findUserHome = function(userId, cb){
  var eventRegister = new EventRegister();
  var self = this;
  //Lets check if we got a home folder
  eventRegister.once('findOrCreateHome', function(data, isDone){

    self.createFolder({
      name: 'Home',
      owner: data
    }, function(r){
      isDone(r);
    });
  });
  eventRegister
  .queue('findOrCreateHome')
  .onError(function(err){
    cb(err);
  })
  .onEnd(function(data){
    cb(data);
  })
  .start(userId);
};

/**
 * [findUserQueue description]
 * @param  {[type]}   userId   [description]
 * @param  {[type]}   options  [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
 CabinetObject.prototype.findUserQueue = function(userId, options, callback){
  Media.userQueue(userId, options, function(i){
    if(i.length === 0){
      callback({});
    }else{
      callback(i);
    }
  });
}

/**
 * [countUserFiles description]
 * @param  {[type]}   userId   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
 CabinetObject.prototype.countUserFiles = function(userId, callback){
  Media.countUserFiles(userId, function(count){
    callback(count);
  });
};

/**
 * [deleteFileRecord description]
 * @param  {[type]}   obj      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
 CabinetObject.prototype.deleteFileRecord = function(obj, callback){
  var v4ult = new V4ult();

    //Fetch More Data one 
    // function produceIdentifier(media_id)
    // console.log(obj);
    //var media = new Media();
    //Moves a file into the trash folder
    Media.update({"mediaNumber": obj.fileId},
    {
      $set: {
        "visible": 2
      }
    }, function(err, affectedRows){
      if(util.isError(err)){
        callback(err);
      }else{
        Media.one(obj.fileId, function(r){
          if(util.isError(r)){
            callback(r);
          }else{
            //Remove file from file system
            v4ult.delete(r.identifier, function(r){
              if(util.isError(r)){
                callback(r);
              }else if(r === false){
                var e = new Error(r);
                callback(e);
              }else{
                callback(r);
              }
            });
          }
        });
      }
    });



  }


/**
 * [unQueue removes an uncompleted upload from the file queue.  Perfoms a delete operation
 * on the temporary chunks already uploaded and removes the entry from the DB.]
 * @param  {[type]}   identifier [description]
 * @param  {[type]}   userId     [description]
 * @param  {Function} callback   [description]
 * @return {[type]}              [description]
 */
 CabinetObject.prototype.unQueue = function(mediaNo, userId, callback){
   var utility = new Utility();
   var identifier;

   var options = {
    onDone: function(){
      Media.remove({owner: userId, identifier: identifier}, function(err, i){
        if(err){
          callback(err);
        }else{
          callback(i);
        }
      });
    }
  };

  Media.one(mediaNo, function(i){
    if(i instanceof Error){
      callback(i);
    }else{
      identifier = i.identifier;
      utility.clean(identifier,null, options);
    }
  }); 
};

/**
 * [updateTags description]
 * @param  {[type]}   file_id [description]
 * @param  {[type]}   owner   [description]
 * @param  {[type]}   tags    [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 */
 CabinetObject.prototype.updateTags = function(file_id, owner, tags, cb){
  Media.update({'mediaNumber': Number(file_id), 'owner': owner}, {
    $set:{
      tags: tags
    }
  }, function(err, i){
    if(err){
      cb(err);
    }else{
      cb(true);
    }
  });
};

/**
 * [getFile description]
 * @param  {[type]}   mediaId [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 */
 CabinetObject.prototype.getFile = function(mediaId, cb){
  Media.findOne({'mediaNumber': mediaId, 'visible': 1})
  .lean()
  .exec(function(err, i){
    if(err){
      cb(new Error(err));
    }else{
      cb(i);
    }
  })
}

/**
 * [search description]
 * @param  {[type]}   query [description]
 * @param  {Function} cb    [description]
 * @return {[type]}         [description]
 */
 CabinetObject.prototype.search = function(query, cb){
  Media.search({query: query}, function(err, i){
    if(err){
      cb(err);
    }else{
      cb(i);
    }
  })
};

/**
 * [serveFile sends the file to the browser for download]
 * @param  {[type]}   mediaId [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 */
 CabinetObject.prototype.serveFile = function(mediaId, cb){

  this.getFile(mediaId, function(fileNfo){
    var filePath = path.join(process.env.APP_HOME, config.app.home, 'v4nish', fileNfo.identifier);
    fs.exists(filePath, function(itdz){
      if(itdz){
        cb(filePath, fileNfo.filename);
      }else{
        cb(new Error('missing file'));
      }
    });    
  });

};


CabinetObject.prototype.count = function(userId, cb){
  Media.aggregate([
  {
    $match:{
      owner: userId,
      visible: 1
    }
  },  
  { 
    $group: {
      _id: '$owner',
      size: {
        $sum: '$size'
      },
      files:{
        $sum: 1
      }
    }
  }

  ], function(err, result){
    if(err){
      cb(new Error(err));
    }else{
      cb(result);
    }
  });
};

CabinetObject.prototype.createFolder = function(props, cb){
  if(!props.name) return cb(new Error('Empty Folder name'));
  if(!props.owner) return cb(new Error('Owner not supplied'));
  if(props.type === 'sub' && !props.parent) return cb(new Error('Parent folder not supplied'));
  
  var folderId = [props.name, props.owner, props.parent].join('-');

  //Find the folder first
  Folder
  .findOne({folderId: folderId})
  .exec(function(err, i){
    if(!_.isEmpty(i)){
      cb(i);
    }else{
      //If we cant find a folder 
      //we make one.
      var folder = new Folder(props);
      folder.folderId =  folderId;
      folder.save(function(err, i){
        if(err){
          util.puts(err);
          cb(new Error('Error creating folder'));
        }else{
          cb(i);
        }
      });
    }
  });
};

/**
 * deletes a folder from the db. The folder 
 * must be empty i.e. contain no files or 
 * sub folders for the removal to be successful.
 * @param  {object}   obj An object with folderId and userId
 * properties
 * @param  {Function} cb  Callback to execute when complete.
 * @return {Boolean}       Boolean
 */
CabinetObject.prototype.deleteFolderRecord = function deleteFolderRecord (obj, cb) {
  var register = new EventRegister();

  var self = this;

  register.once('findFolder', function (data, isDone) {
    //find folder,
    Folder
    .findOne(data)
    .exec(function(err, folder){
      if (err) {
        isDone(err);
      }
      if (!folder) {
        return isDone(errors('FolderNotFoundError'));
      }
      isDone(folder);

    });
  });

  register.once('fetchFiles', function (data, isDone) {
    self.findUserFiles(userId, {folder: data._id}, function(r){
      if(_.isEmpty(r)){
        //passing on the mongoose object.
        //meaning the folder doesnt have any files
        isDone(data);
      }else{
        isDone(errors('FolderHasError'));
      }
    });    
  });
  register.once('fetchSubFolders', function (data, isDone) {
    self.findSubFolder(userId, {id: data._id}, function(r){
      if(_.isEmpty(r)){
        //passing on the mongoose object.
        //meaning the folder doesnt have any sub folders
        isDone(data);
      }else{
        isDone(errors('FolderHasError'));
      }      
    });    
  });
  register.once('removeFolder', function (data, isDone) {
      //data is a mongoose object with
      //a remove method
      data.remove(function (err, done) {
        if (err) {
          cb(err);
        }
        if (!done) {
          cb(errors('FolderRemoveError'));
        }
        cb(true);
      });
  });

  //find folder files,
  //delete folder files,
  //delete folder
  //send response
  
  register
  .queue('findFolder', 'fetchFiles', 'fetchSubFolders', 'removeFolder')
  .onError(function (err) {
    cb(err);
  })
  .onEnd(function (r) {
    cb(r);
  })
  .start(obj);
};

module.exports.cabinet =  CabinetObject;

var cabinet = new CabinetObject();


module.exports.routes = function(app){

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
  app.get('/users/media/:mediaId', function(req, res, next){
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

  app.del('/users/:userId/file/:fileId', function(req, res, next){
    var obj = {
      fileId: req.params.fileId,
      userId: req.params.userId,
      identifier: req.body.identifier
    };
    cabinet.deleteFileRecord(obj,  function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  //deletes a folder
  app.del('/users/:userId/folder/:folderId', function(req, res, next){
    var obj = {
      folderId: req.params.folderId,
      userId: req.params.userId
    };
    cabinet.deleteFolderRecord(obj,  function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  app.del('/users/:userId/queue/:queueId', function(req, res, next){
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