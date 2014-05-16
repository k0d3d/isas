var Utility = require('../lib/utility.js');
var EventRegister = require('../lib/event_register.js').register;
var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Stream = require('stream').Stream,
    mongoose = require('mongoose'),
    Media = require('../models/media').Media,
    Folder = require('../models/media').Folder,
    Cabinet = require('./cabinet').cabinet,
    config = require('config'),
    cors = require('../lib/middlewares/cors'),
    mime = require('mime'),
    hashr = require('../lib/hash.js'),
    _ = require('underscore');

//V4ult Class
function V4ult(){
  this.fileParameterName = 'file';
  this.uuid = '';
  this.chunkList = [];
  var stream = Media.synchronize(), count = 0;

  stream.on('data', function(err, doc){
    count++;
  });
  stream.on('close', function(){
    console.log('indexed ' + count + ' documents!');
  });
  stream.on('error', function(err){
    console.log(err);
  });

}



V4ult.prototype.constructor = V4ult;

/**
 * [save Saves a file and it upload progress]
 * @param  {[type]}   prop     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.save = function(prop, callback){
  var utility = new Utility();
  var folder = function(){

  };
  var q = Media.findOne({'owner': prop.owner, 'visible':1});
  q.where('identifier', prop.identifier);
  q.exec(function(err, i ){
    if(_.isNull(i)){
      var media = new Media(prop);
      media.mediaNumber = utility.mediaNumber();
      media.save(function(err, i){
        if(err){
          callback(err);
        }else{
          i.index(function(err){
            if(!err)callback(i);
          });
        }
      });      
    }else{
      Media.update({_id: i._id}, prop, function(err, i){
        if(err){
          callback(err);
        }else{
          callback(i);
        }
      });
    }
  });
};


V4ult.prototype._deleteTemp =  function (identifier,userId,  callback){
  var utility = new Utility();
  var options = {onDone: function(){
    callback(true);
  } };
  utility.clean(identifier,userId, options);
}



/**
 * _postHandler Handles all chunk post request and send response when complete
 * @param  {Object}   fields      [Request Body]
 * @param  {Object}   files      [Request Body]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.postHandler = function (fields, files, callback){
  var utility = new Utility();
  var eventRegister = new EventRegister();

  var self = this;

  var chunkNumber = fields.flowChunkNumber;
  var chunkSize = fields.flowChunkSize;
  var totalSize = fields.flowTotalSize;
  var identifier = utility.cleanIdentifier(fields['x-Authr']+ '-' +fields.flowIdentifier);
  var filename = fields.flowFilename;
  var original_filename = fields.flowIdentifier;
  var totalChunks = fields.flowTotalChunks;
  var sum = fields.sum;
  var filetype = mime.lookup(fields.flowFilename);
  var owner = fields['x-Authr'];
  var folder = hashr.unhashOid(fields.folder);

  eventRegister.on('checkFolder', function(data, isDone){
    var cabinet = new Cabinet();
    if (!data.folder) {    
      cabinet.createFolder({
        name: data.name || 'Home',
        owner: data.owner,
        fileId: data.fileId,
        type: (data.parent) ? 'sub': 'root'
      }, function(r){
        console.log(r);
        data.folder = r._id;
        isDone(data);
      });
    } else {
      isDone(data);
    }
  });

  eventRegister.on('saveFile', function(data, isDone){
    // if(parseInt(data.chunkNumber) === 1 || chunkNumber === totalChunks){
      //TODO:: log file save / upload completed
      //This saves the file record and just outputs the saved object
      //isDone is called so the upload can process without 
      //waiting for the save method to complete.
      process.nextTick(function() {
        self.save(data, function(i){
          util.puts(i);
        });
      });
      //Continue the upload process
      isDone(data);
    // }else{
    //   //Continue uploading chunkks
    //   isDone(data);
    // }
  });

  eventRegister.on('write', function(data, isDone){
    if(chunkNumber === totalChunks){
      //Create writeableStream. 
      //Happens ONCE. after ^
      console.log(process.env.APP_HOME);
      var filepath = path.join(process.env.APP_HOME, config.app.home, 'v4nish', identifier);
      var stream = fs.createWriteStream(filepath);

      //Run the $.write method
      utility.write(identifier, stream, function(s){
        isDone(data);
      });

    }else{
      isDone(data);
    }
  });

  eventRegister.on('deleteTemp', function(data, isDone){
    //Runs after the last chunk has been piped
    //Deletes all temporary files    
    if(chunkNumber === totalChunks){
      self._deleteTemp(identifier, owner, function(f){
        console.log(f === true ? 'Delete Completed': 'Error Deleting');
      });
      isDone(data);
    }else{
      isDone(data);
    }
  });

  eventRegister.on('moveFile', function(data, isDone){
    // Save the chunk (TODO: OVERWRITE)
    fs.rename(files[self.fileParameterName].path, chunkFilename, function(){
      var tosaveObj = {
          progress: chunkNumber,
          identifier: identifier,
          filename: filename,
          size: totalSize,
          chunkCount: totalChunks,
          sum : sum,
          owner: owner,
          type: filetype,
          folder: folder,
          completedDate: chunkNumber === totalChunks ? Date.now() : ''
        };
        isDone(tosaveObj);
    });
  }); 

  if(!files[self.fileParameterName] || !files[self.fileParameterName].size) {
    callback(3);
    //callback(3, null, null, null);
    return;
  }

  var validation = utility.validateRequest(chunkNumber, chunkSize, totalSize, identifier, files[self.fileParameterName].size);   

  if(validation =='valid') {

    var chunkFilename = utility.getChunkFilename(chunkNumber, identifier);
    
    eventRegister
    .queue('moveFile', 'checkFolder', 'write', 'saveFile', 'deleteTemp')
    .onEnd(function(data){
      callback(1);
    })
    .onError(function(err){
      callback(err);
    })
    .start(chunkFilename);

  } else {
        callback(validation);
        //callback(validation, filename, original_filename, identifier);
  }
};

/**
 * [_getHandler used to check validity of chunks for cross session resumable uploads]
 * @param  {[type]}   req      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.getHandler = function  (param, cb){
  var utility = new Utility();
  var chunkNumber = param('flowChunkNumber', 0);
  var chunkSize = param('flowChunkSize', 0);
  var totalSize = param('flowTotalSize', 0);
  var identifier = param('throne', '')+ '-' +param('flowIdentifier', '');
  var filename = param('flowFilename', '');
  var owner = param('throne', '');

  if(utility.validateRequest(chunkNumber, chunkSize, totalSize, identifier, filename)=='valid') {
    var chunkFilename = utility.getChunkFilename(chunkNumber, identifier);
    fs.exists(chunkFilename, function(exists){
      if(exists){
        cb({'chunkFilename': chunkFilename, 'filename': filename, 'identifier': identifier});
      } else {
        cb(new Errow('not found'));
      }
    });
  } else {
    cb(new Error('not found'));
  }
};



V4ult.prototype.delete = function (identifier, callback){
  var filepath = path.join(process.env.APP_HOME, config.app.home, 'v4nish', identifier);
  fs.exists(filepath, function(exists){
    if(exists){
      fs.unlink(filepath, function(r){
        if(util.isError(r)){
          callback(r);
        }else{
          callback(true);
        }
      });
    }else{
      callback(false);
    }
  });
};


exports.v4ult = V4ult;

var v4ult = new V4ult();

exports.routes = function(app){
  // Handle uploads through flow.js
  app.post('/upload', cors, function(req, res){
    var fields = req.body;
    var files = req.files;   
    //CORS Headers
    v4ult.postHandler(fields, files, function(status){
      console.log(status);
      //Send appoproiate response
      if(status === 1){
        res.json(200, {status: 'done'});
      }else if(status === 2){
        res.send(200, {status: 'inprogress'});
      }else{
        res.json(400, status);
      }
    });
  });

  // Handle cross-domain requests
  // NOTE: Uncomment this funciton to enable cross-domain request.

  app.options('/upload', function(req, res){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.send(true, {
      'Access-Control-Allow-Origin': '*'
    }, 200);
  });


  // Handle status checks on chunks through flow.js
  app.get('/upload',cors, function(req, res, next){

    v4ult.getHandler(req.param, function(r){
      if(util.isError(r)){
        res.json(404, r);
      }else{
        res.json(200, r);
      }
    });
  });
 
};