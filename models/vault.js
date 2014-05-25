var Utility = require('../lib/utility.js'),
    Fm = require('../lib/file-manager.js'),
    EventRegister = require('../lib/event_register.js').register,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    // Stream = require('stream').Stream,
    Media = require('./media/media').Media,
    Cabinet = require('./media').cabinet,
    config = require('config'),
    mime = require('mime'),
    hashr = require('../lib/hash.js'),
    errors = require('../lib/errors.js'),
    _ = require('underscore');

//V4ult Class
function V4ult(){
  this.fileParameterName = 'file';
  this.uuid = '';
  this.chunkList = [];
  this.vault_fileId = function () {
    return [this._folder, this._owner, this._identifier].join('-');
  };

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
            if(!err){callback(i);}
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


/**
 * _postHandler Handles all chunk post request and send response when complete
 * @param  {Object}   fields      [Request Body]
 * @param  {Object}   files      [Request Body]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.postHandler = function (fields, files, callback){
  var fm = new Fm(), utility = new Utility();
  var eventRegister = new EventRegister();

  var self = this;

  self._chunkNumber = fields.flowChunkNumber;
  self._chunkSize = fields.flowChunkSize;
  self._totalSize = fields.flowTotalSize;
  self._identifier = utility.cleanIdentifier(fields.flowIdentifier);
  self._filename = fields.flowFilename;
  // self._original_filename = fields.flowIdentifier;
  self._totalChunks = fields.flowTotalChunks;
  self._sum = fields.sum;
  self._filetype = mime.lookup(fields.flowFilename);
  self._owner = fields['x-Authr'];
  self._folder = hashr.unhashOid(fields.folder);

  eventRegister.on('checkFolder', function(data, isDone){
    var cabinet = new Cabinet();
    if (!data.folder) {    
      cabinet.createFolder({
        name: data.name || 'Home',
        owner: data.owner,
        fileId: data.fileId,
        type: (data.parent) ? 'sub': 'root'
      }, function(r){
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
    if(self._chunkNumber === self._totalChunks){
      //Create writeableStream. 
      //Happens ONCE. after ^
      var filepath = path.join(process.env.APP_HOME, config.app.home, 'v4nish', self._identifier);
      var stream = fs.createWriteStream(filepath);

      //Run the $.write method
      fm.write(self._identifier, stream, function(){
        isDone(data);
      });

    }else{
      isDone(data);
    }
  });

  eventRegister.on('deleteTemp', function(data, isDone){
    //Runs after the last chunk has been piped
    //Deletes all temporary files    
    if(self._chunkNumber === self._totalChunks){
      fm.deleteTemp(self._identifier, self._owner, function(f){
        console.log(f === true ? 'Delete Completed': 'Error Deleting');
      });
      isDone(data);
    }else{
      isDone(data);
    }
  });

  eventRegister.on('moveFile', function(data, isDone){
    // Save the chunk (TODO: OVERWRITE)
    fs.rename(files[self.fileParameterName].path, self._chunkFilename, function(){
      var tosaveObj = {
          progress: self._chunkNumber,
          identifier: self._identifier,
          filename: self._filename,
          size: self._totalSize,
          chunkCount: self._totalChunks,
          sum : self._sum,
          owner: self._owner,
          type: self._filetype,
          folder: self._folder,
          completedDate: self._chunkNumber === self._totalChunks ? Date.now() : ''
        };
        isDone(tosaveObj);
    });
  }); 

  if(!files[self.fileParameterName] || !files[self.fileParameterName].size) {
    callback(3);
    //callback(3, null, null, null);
    return;
  }

  var validation = fm.validateRequest(self._chunkNumber, self._chunkSize, self._totalSize, self._identifier, files[self.fileParameterName].size);   

  if(validation === 'valid') {

    var chunkFilename = fm.getChunkFilename(self._chunkNumber, self._identifier);
    
    eventRegister
    .queue('moveFile', 'checkFolder', 'write', 'saveFile', 'deleteTemp')
    .onEnd(function(){
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
  var fm = new Fm();
  var chunkNumber = param('flowChunkNumber', 0);
  var chunkSize = param('flowChunkSize', 0);
  var totalSize = param('flowTotalSize', 0);
  var identifier = param('throne', '')+ '-' +param('flowIdentifier', '');
  var filename = param('flowFilename', '');
  // var owner = param('throne', '');

  if(fm.validateRequest(chunkNumber, chunkSize, totalSize, identifier, filename) === 'valid') {
    var chunkFilename = fm.getChunkFilename(chunkNumber, identifier);
    fs.exists(chunkFilename, function(exists){
      if(exists){
        cb({'chunkFilename': chunkFilename, 'filename': filename, 'identifier': identifier});
      } else {
        cb(errors.httpError(404));
      }
    });
  } else {
    cb(errors.httpError(404));
  }
};


module.exports = V4ult;