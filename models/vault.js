var u = require('../lib/utility.js'),
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


function normalizer (collection, field) {
  var i;
  if (collection[field]) {
    i = collection[field];
  } else if (collection['_'+field]) {
    i = collection['_' + field];
  } else {
    throw new errors.ArgumentError('normalizer', field);
  }
  console.log(i);
  return i;
}
/**
 * [IxitFile description]
 * @param {[type]} filedata hash with mandatory properties
 * folder, filename, owner, chunkNumber, totalChunks
 */
function IxitFile (filedata) {
  // console.log(filedata);
  // console.log(filedata[normalizer(filedata, 'filename')]);
  // console.log(filedata[normalizer(filedata, 'owner')]);
    var self = this;
    if (!filedata && !arguments.length) {
      throw new Error('missing arguments for IxitFile constructor');
    }

    if (!filedata.filefolder || !filedata.owner) {
      throw new Error('missing parameter for IxitFile constructor');
    }
    //for those sometimes, we can add this in here,
    // if (filedata[normalizer(filedata, 'folder')].indexOf('ixitbot') > -1) {
    //   filedata.folder = 'ixitbot';
    // }

//     var fm = new Fm();
//     filedata.identifier = fm.getChunkFilePath(filedata._chunkNumber, fm.vault_fileId(filedata));
    console.log(filedata);
    if (
      !filedata[normalizer(filedata, 'chunkNumber')] ||
      !filedata[normalizer(filedata, 'totalChunks')]
    ) {
      throw new Error('missing parameter for IxitFile constructor');
    }
    if (filedata._chunkNumber === filedata._totalChunks) {
      filedata.completedDate =  Date.now();
    }
    if (!filedata.filesize && !filedata._totalSize) {
      filedata.filesize = 1;
    } else {
      filedata.filesize = filedata._totalSize;
    }
    if (!filedata.filetype) {
      filedata.filetype = filedata.type || filedata._filetype || 'application/octet-stream';
    }

    for(var f in filedata) {
      if (filedata.hasOwnProperty(f)) {
        self[f] = filedata[f];
      }
    }

    return self;

}

IxitFile.prototype.constructor = IxitFile;

function dbValuesAssembly (fileObj) {
  if (fileObj.isTransformed) return fileObj;
  return {
          filename: fileObj._filename,
          identifier: fileObj.identifier,
          owner: fileObj._owner,
          progress: fileObj._chunkNumber,
          chunkCount: fileObj._totalChunks,
          filetype: fileObj._filetype,
          size: fileObj._totalSize,
          folder: fileObj.filefolder,
          isTransformed: true
  }
}

/* Common methods for file upload operation*/
var vFunc = {
  /**
   * saves an uploaded file chunk object to the database
   * @param  {Object} props chunk object.
   * @return {Promise}       Promise
   */
  saveChunkToDB: function saveChunkToDB (fileObj) {
    debug(fileObj);
    var d = Q.defer();

    //just beginning
    if (fileObj._chunkNumber == 1) {
      var q = Media.findOne({'owner': fileObj._owner, 'visible':1});
      q.where('identifier', fileObj.identifier);
      q.exec(function(err, foundDoc ){
        if (err) {
          return d.reject(err);
        }
        //remove "undefined" values
        if (fileObj.folder === undefined || fileObj.folder === 'undefined') {
          delete fileObj.folder;
        }
        if (fileObj._owner === undefined || fileObj._owner === 'undefined') {
          delete fileObj.owner;
        }
        if(!foundDoc){
          var media = new Media(dbValuesAssembly(fileObj));

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
        } else {
          d.resolve(fileObj);
          return d.promise;
        }
      });
    }
    //if upload is complete
    else if (fileObj._chunkNumber == fileObj._totalChunks){
      var q = Media.findOne({'owner': fileObj._owner, 'visible':1});
      q.where('identifier', fileObj.identifier);
      q.exec(function (err, foundDoc) {
        if (err) {
          return d.reject(err);
        }
        if(!foundDoc){

          d.reject(errors.nounce('OperationFailed'));
          return d.promise;
        }
        foundDoc.progress =  dbValuesAssembly(fileObj).progress;
        foundDoc.completedDate = Date.now();
        foundDoc.save(function (err, foundDoc) {
            if (foundDoc){
              fileObj.fileDocument = foundDoc;
              d.resolve(fileObj);
            } else {
              d.reject(errors.nounce('UpdateHasError'));
            }
        });
      })
    }
        //   Media.update({identifier: fileObj.identifier}, dbValuesAssembly(fileObj), function(err, done){
        //     if(err){
        //       d.reject(err);
        //     }

        //   });
        // } else {
        //   d.resolve(fileObj);
        //   return d.promise;
        // }

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
    cabinet.createFolder({
      //breaking change:::
      //fileObj.name......
      name: (fileObj.folder != 'undefined' &&
        fileObj.folder != undefined &&
        fileObj.folder.length > 0
      ) ? fileObj.folder : 'Home',
      owner: fileObj.owner,
      fileId: fileObj.fileId,
      foldertype: (fileObj.parent) ? 'sub': 'root'
    }, function(err, r){
      if (err) {
        return q.reject(err);
      }
      fileObj.filefolder = r._id;
      q.resolve(fileObj);
    });
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


    if(fileObj._chunkNumber === fileObj._totalChunks){
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

    if ((fileObj._chunkNumber == fileObj._totalChunks) || fileObj._chunkNumber == 1) {
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
        fileDocument.progress = fileObj._chunkNumber;
//         var extendedFileHash = _.extend(fileDocument, _.pick(fileObj,
//         ['progress', 'identifier', 'chunkCount', 'mediaNumber']));
        redisClient.hmset(fileObj.identifier, fileDocument,
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
   * a simple prep the 'file object' method.
   * for now it just occupies space. might
   * trash it or make it more useful.
   * @param  {[type]} args
   * @return {[type]}      [description]
   */
  prepFileProperties: function prepFileProperties (fileObj) {
    var q = Q.defer();
    vFunc.checkFolder(fileObj)
    .then(function (newFileObj) {
      q.resolve(new IxitFile(newFileObj));
    }, function (err) {
      q.reject(err);
    })
    .catch(function (e) {
      q.reject(e);
    });
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
 * this method handles files which have already been
 * moved into the vault. it can also be used when
 * making copies of the file and returning the document
 * saved which should include the ixit id.
 *
 * and send response when complete.
 * @param  {Object}   reqObject      [Request Body]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
V4ult.prototype.postCompleteFileHandler = function postCompleteFileHandler (fileObject) {
  var q = Q.defer(), self = this;

  vFunc.prepFileProperties(fileObject)
  .then(function (fileObj) {
    return vFunc.saveChunkToDB(fileObj);
  })
  .then(function (fileObj) {
    return vFunc.saveChunkToRedis(fileObj, self.redisClient);
  })
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
V4ult.prototype.postOneChunkHandler = function postOneChunkHandler (reqObject) {
  var q = Q.defer(), self = this;

  vFunc.prepFileProperties(reqObject)
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
  debug('postMultipleChunkHandler');

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
    debug('processing-upload-job');
    vFunc.prepFileProperties(job.data)
    .then(function (f) {
      debug('joinCompletedFileUpload');
      return vFunc.joinCompletedFileUpload(f);
    })
    .then(function (fileObj) {
      debug('now savetodb');
      return vFunc.saveChunkToDB(fileObj);
    })
    .then(function (fileObj) {
      debug('save to redis');
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
      debug('done');
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