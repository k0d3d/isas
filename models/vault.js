var Utility = require('../lib/utility.js'),
    Fm = require('../lib/file-manager.js'),
    Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    debug = require('debug')('dkeep'),
    // Stream = require('stream').Stream,
    Media = require('./media/media').Media,
    syncIndex = require('./media/media').syncIndex,
    Cabinet = require('./media').cabinet,
    config = require('config'),
    errors = require('../lib/errors.js'),
    _ = require('lodash');


//V4ult Class
function V4ult(redis_client, jobQueue, s3client){
  this.redisClient = redis_client;
  this.jobQueue = jobQueue;
  this.s3client = s3client;
  this.fileParameterName = 'file';
  this.uuid = '';
  this.chunkList = [];
}

/* Common methods for file upload operation*/
var vFunc = {
  /**
   * saves an uploaded file chunk object to the database
   * @param  {Object} props chunk object.
   * @return {Promise}       Promise
   */
  saveChunkToDB: function saveChunkToDB (fileObj) {
    debug('saveChunkToDB');
    var d = Q.defer();
    var utility = new Utility();

    //if its completed or just beginning
    if ((fileObj.progress == fileObj.chunkCount) || fileObj.progress == 1) {
      var q = Media.findOne({'owner': fileObj.owner, 'visible':1});
      q.where('identifier', fileObj.identifier);
      q.exec(function(err, foundDoc ){
        //remove "undefined" values
        if (fileObj.folder === undefined || fileObj.folder === 'undefined') {
          delete fileObj.folder;
        }
        if (fileObj.owner === undefined || fileObj.owner === 'undefined') {
          delete fileObj.owner;
        }
        if(!foundDoc){
          var media = new Media(fileObj);
          media.mediaNumber = ''+ utility.mediaNumber();
          media.save(function(err, foundDoc){
            if(err){
              d.reject(err);
            }else{
              fileObj.fileDocument = foundDoc;
              d.resolve(fileObj);
              foundDoc.index(function(err){
                if(err){
                  debug(err);
                }
              });
            }
          });
        }else{
          Media.update({identifier: fileObj.identifier}, fileObj, function(err, done){
            if(err){
              d.reject(err);
            }
            if (done){
              fileObj.fileDocument = foundDoc;
              d.resolve(fileObj);
            } else {
              d.reject(errors.nounce('UpdateHasError'));
            }
          });
        }
      });
    } else {
      d.resolve(fileObj);
      return d.promise;
    }

    return d.promise;
  },
  /**
   * attempts to create or locate the virtual folder
   * where the file will be stored.
   * @return {[type]} [description]
   */
  checkFolder: function checkFolder (fileObj) {
    var q = Q.defer();
    debug('checkFolder');

    var cabinet = new Cabinet();
    if (!fileObj.folder || fileObj.folder !== 'undefined') {
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
    debug('joinCompletedFileUpload');
    var q = Q.defer();
    var fm = new Fm();

    if(fileObj.progress === fileObj.chunkCount){
      //Create writeableStream.
      //Happens ONCE. after ^
      var filepath = path.join(fm.FILESTORAGEDIR, fileObj.identifier);
      var stream = fs.createWriteStream(filepath);

      //Run the $.write method
      fm.write(fileObj, stream)
      .then(function(){
        //re-index es
        syncIndex();

        q.resolve(fileObj);
      });

    }else{
      q.resolve(fileObj);
    }
    return q.promise;
  },
  /**
   * saves information / properties for an upload in-progress to redis for quick
   * access. We always expect to return an object containing the 'mediaNumber'
   * property of the upload in-progress. This property is available in the fileObj
   * argument when an upload just starts and is completed. We need to retain that
   * property in the redis hash. We achieve this by allowing the initial and final
   * chunk upload to create / overwrite the redis hash. Every chunk upload in between
   * will update the hash using _.extend.
   * @param  {[type]} fileObj     [description]
   * @param  {[type]} redisClient [description]
   * @return {[type]}             [description]
   */
  saveChunkToRedis: function saveChunkToRedis (fileObj, redisClient) {
    debug('saveChunkToRedis');
    var q = Q.defer();

    if ((fileObj.progress == fileObj.chunkCount) || fileObj.progress == 1) {
      redisClient.hmset(fileObj.identifier, _.pick(fileObj.fileDocument,
        ['progress', 'identifier', 'chunkCount', 'mediaNumber']),
        function (err){
          if (err) {
            return q.reject(err);
          }
          redisClient.expire(fileObj.identifier, 5 * 60 * 60);
          q.resolve(fileObj);
      });
    } else {
      vFunc.getChunkFromRedis(fileObj.identifier, redisClient)
      .then(function (fileDocument) {
        var extendedFileHash = _.extend(fileDocument, _.pick(fileObj,
        ['progress', 'identifier', 'chunkCount', 'mediaNumber']));
        redisClient.hmset(fileObj.identifier, extendedFileHash,
          function (err){
            if (err) {
              return q.reject(err);
            }
            redisClient.expire(fileObj.identifier, 5 * 60 * 60);
            q.resolve(fileObj);
        });
      }, function (err) {
        q.reject(err);
      });
    }

    return q.promise;
  },
  /**
   * gets an upload in-progress information / properties from a redis
   * server / instance.
   * @param  {[type]} fileIdentifier [description]
   * @return {[type]}                [description]
   */
  getChunkFromRedis: function getChunkFromRedis (fileIdentifier, redisClient) {
    debug('getChunkFromRedis');
    var q = Q.defer();

    redisClient.hgetall(fileIdentifier, function (err, data) {
      if (err) {
        return q.reject(err);
      }
      q.resolve(data);
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
    debug('vfunc deleteUploadChunks');
    var q = Q.defer();
    var fm = new Fm();
    if(parseInt(fileObj.progress) === parseInt(fileObj.chunkCount)){
      fm.clean(fileObj, fileObj.owner)
      .then(function(f){
        debug(f === true ? 'Delete Completed': 'Error Deleting');
        q.resolve(fileObj);
      }, function (err) {
        debug('Error Deleting');
        debug(err);
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
  moveFile: function moveFile (self) {
    var q = Q.defer();



    // Save the chunk (TODO: OVERWRITE)
    // fs.rename(
    //   files[self.fileParameterName].path,
    //   fm.getChunkFilePath(self._chunkNumber, self.vault_fileId()),
    //   function(err){
    //     if (err) {
    //       return q.reject(err);
    //     }
    // });
    var fileObj = {
      progress: self._chunkNumber,
      identifier: self.identifier,
      filename: self._filename,
      size: self._totalSize,
      chunkCount: self._totalChunks,
      sum : self._sum,
      owner: self._owner,
      type: self._filetype,
      folder: self._folder,
      chunkId: self._chunkId
    };
    if (self._chunkNumber === self._totalChunks) {
      fileObj.completedDate =  Date.now();
    }
    q.resolve(fileObj);
    return q.promise;
  },
  sendToS3 : function sendToS3 (client, vault_fileId) {
    debug('sendTos3');
    var q = Q.defer();
    var fm = new Fm();

    var params = {
      localFile: path.join(fm.FILESTORAGEDIR, vault_fileId),

      s3Params: {
        Bucket: config.app.AWS_S3.S3_BUCKET,
        Key: vault_fileId,
        // other options supported by putObject, except Body and ContentLength.
        // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
      },
    };
    var uploader = client.uploadFile(params);

    uploader.on('progress', function() {
      debug('progress',
                Math.round(uploader.progressAmount / uploader.progressTotal * 100) + '%');
    });

    uploader.on('error', function(err) {
      console.error("unable to upload:", err);
      q.reject(err);
    });

    uploader.on('end', function() {
      q.resolve(true);
    });

    return q.promise;
  }
};


V4ult.prototype.constructor = V4ult;
/**
 * postMultipleChunkHandler Handles multiple chunk post request
 * and send response when complete.
 * @param  {Object}   reqObject      [Request Body]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.postOneChunkHandler = function postOneChunkHandler (reqObject) {
  var q = Q.defer(), self = this;

  vFunc.moveFile(reqObject)
  .then(vFunc.checkFolder)
  .then(vFunc.joinCompletedFileUpload)
  .then(function (fileObj) {
    return vFunc.saveChunkToDB(fileObj);
  })
  .then(function (fileObj) {
    return vFunc.saveChunkToRedis(fileObj, self.redisClient);
  })
  .then(vFunc.deleteUploadChunks)
  .then(function (fileObj) {
    q.resolve(_.pick(fileObj.fileDocument.toObject(),
        ['progress', 'identifier', 'chunkCount', 'mediaNumber']));
    // return self.s3uploader(fileObj);
  }, function (err) {
    q.reject(err);
  })
  .catch(function (err) {
    debug(err.stack);
    q.reject(errors.nounce('UploadHasError'));
  });


  return q.promise;
};

/**
 * postMultipleChunkHandler Handles multiple chunk post request
 * and send response when complete.
 * @param  {Object}   reqObject      [Request Body]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.postMultipleChunkHandler = function (reqObject){
  var self = this;
  var q = Q.defer();

  //should add chunk processing to job queue
  var job = self.jobQueue.create('upload', reqObject);

  job.on('complete', function (){
      debug('Job', job.id, ' has completed');
  });
  job.on('failed', function (){
      debug('Job', job.id, ' has failed');
  });

  job.save(function (err) {
    if (err) {
      debug(err.stack);
      q.reject(errors.nounce('UploadHasError'));
    }
    vFunc.getChunkFromRedis(reqObject.identifier, self.redisClient)
    .then(function (fileData) {
      q.resolve(fileData);
    }, function(err) {
      q.reject(err);
    });
  });

  self.jobQueue.process('upload', function (job, done){
    /* carry out all the job function here */

    vFunc.moveFile(job.data)
    .then(vFunc.checkFolder)
    .then(vFunc.joinCompletedFileUpload)
    .then(function (fileObj) {
      return vFunc.saveChunkToDB(fileObj);
    })
    .then(function (fileObj) {
      return vFunc.saveChunkToRedis(fileObj, self.redisClient);
    })
    .then(vFunc.deleteUploadChunks)
    // .then(function (fileObj) {
    //   return self.s3uploader(fileObj);
    // })
    .catch(function (err) {
      debug(err.stack);
      done(err);
      q.reject(errors.nounce('UploadHasError'));
    })
    .done(function () {
      if (done) {
        done();
      }
    }, function (err) {
      done(err);
    });

  });

  return q.promise;
};

V4ult.prototype.s3uploader = function s3uploader (fileObj) {
  var self = this;
  var q = Q.defer();
  var fm = new Fm();
  //if the file upload isnt complete,
  //no need to send to s3
  if (!fileObj.completedDate) {
    q.resolve(fileObj);
  } else {

    //should add chunk processing to job queue
    var job = self.jobQueue.create('s3upload', fileObj);

    job.on('complete', function (){
        debug('Upload Job', job.id, ' has completed');
    });
    job.on('failed', function (){
        debug('Upload Job', job.id, ' has failed');
    });

    job.save(function (err) {
      if (err) {
        debug(err.stack);
        q.reject(errors.nounce('S3UploadHasError'));
      }
      q.resolve(fileObj);
    });

    self.jobQueue.process('s3upload', function (job, done){
      /* carry out all the job function here */

      vFunc.sendToS3(self.s3client, job.data.identifier)
      .catch(function (err) {
        debug(err.stack);
        done(err);
        q.reject(errors.nounce('S3UploadHasError'));
      })
      .done(function () {
        if (done) {
          done();
        }

      }, function (err) {
        done(err);
      });

    });
  }

  return q.promise;
};


/**
 * [_getHandler used to check validity of chunks for cross session resumable uploads]
 * @param  {[type]}   req      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.getHandler = function  (params){
  var fm = new Fm(), q = Q.defer();

  if(fm.validateRequest(params._chunkNumber, params._chunkSize, params._totalSize, params._chunkId, params._filename) === 'valid') {
    var chunkFilename = fm.getChunkFilePath(params._chunkNumber, fm.vault_fileId(params));
    fs.exists(chunkFilename, function(exists){
      if(exists){
        return q.resolve({'chunkFilename': chunkFilename, 'filename': params._filename, 'identifier': params._chunkId});
      } else {
        return q.reject(errors.httpError(404));
      }
    });
  } else {
    return q.reject(errors.httpError(404));
  }

  return q.promise;
};


module.exports = V4ult;