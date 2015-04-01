var Utility = require('../lib/utility.js'),
    Fm = require('../lib/file-manager.js'),
    Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    // Stream = require('stream').Stream,
    Media = require('./media/media').Media,
    syncIndex = require('./media/media').syncIndex,
    Cabinet = require('./media').cabinet,
    config = require('config'),
    mime = require('mime'),
    hashr = require('../lib/hash.js'),
    errors = require('../lib/errors.js'),
    _ = require('lodash');


//V4ult Class
function V4ult(redis_client){
  this.redisClient = redis_client;
  this.fileParameterName = 'file';
  this.uuid = '';
  this.chunkList = [];
  this.setFields =  function (fields) {
    var self = this, u = new Utility();
    self._chunkNumber = fields.flowChunkNumber;
    self._chunkSize = fields.flowChunkSize;
    self._totalSize = fields.flowTotalSize;
    self._chunkId = u.cleanIdentifier(fields.flowIdentifier);
    self._filename = fields.flowFilename;
    // self._original_filename = fields.flowIdentifier;
    self._totalChunks = fields.flowTotalChunks;
    self._sum = fields.sum;
    self._filetype = mime.lookup(fields.flowFilename);
    self._owner = fields['x-Authr'] || 'anonymous';
    self._folder = fields.folder ? hashr.unhashOid(fields.folder) : null;

  };
  this.vault_fileId = function () {
    return [this._folder, this._owner, this._chunkId, this._totalSize].join('-');
  };

}

/* Common methods for file upload operation*/
var vFunc = {
  /**
   * saves an uploaded file chunk object to the database
   * @param  {Object} props chunk object.
   * @return {Promise}       Promise
   */
  saveChunkToDB: function saveChunkToDB (fileObj) {
    console.log('saveChunkToDB');
    var q = Q.defer();
    var utility = new Utility();

    if ((fileObj.progress !== fileObj.chunkCount) || fileObj.progress != 1) {
      q.resolve(fileObj);
      return q.promise;
    }
    var q = Media.findOne({'owner': fileObj.owner, 'visible':1});
    q.where('identifier', fileObj.identifier);
    q.exec(function(err, foundDoc ){
      if(_.isNull(foundDoc)){
        var media = new Media(fileObj);
        media.mediaNumber = ''+ utility.mediaNumber();
        media.save(function(err, foundDoc){
          if(err){
            q.reject(err);
          }else{
            foundDoc.index(function(err){
              if(!err){
                q.resolve({foundDoc:foundDoc, data: fileObj});
              }
            });
          }
        });
      }else{
        Media.update({_id: foundDoc._id}, fileObj, function(err){
          if(err){
            q.reject(err);
          }else{
            q.resolve({foundDoc:foundDoc, data: fileObj});
          }
        });
      }
    });

    return q.promise;
  },
  /**
   * attempts to create or locate the virtual folder
   * where the file will be stored.
   * @return {[type]} [description]
   */
  checkFolder: function checkFolder (fileObj) {
    var q = Q.defer();
    console.log('checkFolder');

    var cabinet = new Cabinet();
    if (!fileObj.folder) {
      cabinet.createFolder({
        name: fileObj.name || 'Home',
        owner: fileObj.owner,
        fileId: fileObj.fileId,
        type: (fileObj.parent) ? 'sub': 'root'
      }, function(r){
        fileObj.folder = r._id;
        q.resolve(fileObj);
      });
    } else {
      q.resolve(fileObj);
    }
    return q.promise;
  },
  /**
   * when all the chunks / file parts have been uploaded,
   * this will initiate a file join operation which uses a
   * writable stream to pipe the
   * @param  {[type]} fileObj [description]
   * @return {[type]}         [description]
   */
  joinCompletedFileUpload: function joinCompletedFileUpload (fileObj) {
    console.log('joinCompletedFileUpload');
    var q = Q.defer();
    var fm = new Fm();

    if(fileObj.progress === fileObj.chunkCount){
      //Create writeableStream.
      //Happens ONCE. after ^
      var filepath = path.join(fm.FILESTORAGEDIR, fileObj.identifier);
      var stream = fs.createWriteStream(filepath);

      //Run the $.write method
      fm.write(fileObj, stream, function(){
        //re-index es
        syncIndex();

        q.resolve(fileObj);
      });

    }else{
      q.resolve(fileObj);
    }
    return q.promise;
  },
  saveChunkToRedis: function saveChunkToRedis (fileObj, redisClient) {
    console.log('saveChunkToRedis');
    var q = Q.defer();

    redisClient.hmset(fileObj.identifier, _.pick(fileObj, ['progress', 'identifier', 'chunkCount']),
      function (err){
        if (err) {
          return q.reject(err);
        }
        redisClient.expire(fileObj.identifier, 5 * 60);
        q.resolve(fileObj);
      });

    return q.promise;
  },
  /**
   * deletes the upload chunks when a upload is completed
   * or is cancelled.
   * @param  {Object} fileObj hash with progress, chunkCount, identifier, owner
   * @return {[type]}         resolves to fileObj hash, rejects with
   */
  deleteUploadChunks: function deleteUploadChunks (fileObj) {
    console.log('vfunc deleteUploadChunks');
    var q = Q.defer();
    var fm = new Fm();
    if(fileObj.progress === fileObj.chunkCount){
      fm.clean(fileObj, fileObj.owner)
      .then(function(f){
        console.log(f === true ? 'Delete Completed': 'Error Deleting');
        q.resolve(fileObj);
      });
    }else{
      q.resolve(fileObj);
    }
    return q.promise;
  },
  prepareResult: function prepareResult () {

  },
  /**
   * moves a file upload from the system temporary directory
   * to the APPCHUNKDIR.
   * @param  {[type]} args Expects an object with properties, args.files; the files object
   * from an upload middleware eg formidable, and args.self the upload data sent in the request.
   * @return {[type]}      [description]
   */
  moveFile: function moveFile (self, files) {
    var q = Q.defer();
    var fm = new Fm('moveFile');
    console.log();
    // Save the chunk (TODO: OVERWRITE)
    fs.rename(
      files[self.fileParameterName].path,
      fm.getChunkFilePath(self._chunkNumber, self.vault_fileId()),
      function(err){
        if (err) {
          return q.reject(err);
        }
        var fileObj = {
          progress: self._chunkNumber,
          identifier: self.vault_fileId(),
          filename: self._filename,
          size: self._totalSize,
          chunkCount: self._totalChunks,
          sum : self._sum,
          owner: self._owner,
          type: self._filetype,
          folder: self._folder,
          chunkId: self._chunkId,
          completedDate: self._chunkNumber === self._totalChunks ? Date.now() : ''
        };
        q.resolve(fileObj);
    });
    return q.promise;
  }
};


V4ult.prototype.constructor = V4ult;


/**
 * _postHandler Handles all chunk post request and send response when complete
 * @param  {Object}   fields      [Request Body]
 * @param  {Object}   files      [Request Body]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.postHandler = function (fields, files){
  var fm = new Fm();
  var self = this;
  var q = Q.defer();

  self.setFields(fields);

  if(!files[self.fileParameterName] || !files[self.fileParameterName].size) {
    q.reject(errors.nounce('UploadHasError'));
    return q.promise;
  }

  var validation = fm.validateRequest(self._chunkNumber, self._chunkSize, self._totalSize, self.vault_fileId(), files[self.fileParameterName].size);

  if(validation !== 'valid') {
    q.reject(errors.nounce('UploadHasError'));
    return q.promise;
  }

  vFunc.moveFile(self, files)
  .then(vFunc.checkFolder)
  .then(vFunc.joinCompletedFileUpload)
  .then(function (fileObj) {
    return vFunc.saveChunkToRedis(fileObj, self.redisClient);
  })
  .then(function (fileObj) {
    return vFunc.saveChunkToDB(fileObj);
  })
  .then(vFunc.deleteUploadChunks)
  .catch(function (err) {
    console.log(err.stack);
    q.reject(errors.nounce('UploadHasError'));
  })
  .done(function (r) {
    console.log('done gets called');
    var m = (r.progress === r.chunkCount) ? 2 : r;
    q.resolve(m);
  });

  return q.promise;
};


/**
 * [_getHandler used to check validity of chunks for cross session resumable uploads]
 * @param  {[type]}   req      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.getHandler = function  (params, cb){
  var fm = new Fm(), self = this;
  // var chunkNumber = param('flowChunkNumber', 0);
  // var chunkSize = param('flowChunkSize', 0);
  // var totalSize = param('flowTotalSize', 0);
  // var identifier = param('throne', '')+ '-' +param('flowIdentifier', '');
  // var filename = param('flowFilename', '');

  self.setFields(params);
  // var owner = param('throne', '');

  if(fm.validateRequest(self._chunkNumber, self._chunkSize, self._totalSize, self.vault_fileId(), self._filename) === 'valid') {
    var chunkFilename = fm.getChunkFilePath(self._chunkNumber, self.vault_fileId());
    fs.exists(chunkFilename, function(exists){
      if(exists){
        cb({'chunkFilename': chunkFilename, 'filename': self._filename, 'identifier': self.chunkId});
      } else {
        cb(errors.httpError(404));
      }
    });
  } else {
    cb(errors.httpError(404));
  }
};


module.exports = V4ult;