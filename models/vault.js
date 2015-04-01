var Utility = require('../lib/utility.js'),
    Fm = require('../lib/file-manager.js'),
    Q = require('q'),
    EventRegister = require('../lib/event_register.js').register,
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
    _ = require('underscore');

//V4ult Class
function V4ult(){
  this.fileParameterName = 'file';
  this.uuid = '';
  this.chunkList = [];
  this.setFields =  function (fields) {
    var self = this, u = new Utility();
    self._chunkNumber = fields.flowChunkNumber;
    self._chunkSize = fields.flowChunkSize;
    self._totalSize = fields.flowTotalSize;
    self.chunkId = u.cleanIdentifier(fields.flowIdentifier);
    self._filename = fields.flowFilename;
    // self._original_filename = fields.flowIdentifier;
    self._totalChunks = fields.flowTotalChunks;
    self._sum = fields.sum;
    self._filetype = mime.lookup(fields.flowFilename);
    self._owner = fields['x-Authr'] || 'anonymous';
    self._folder = fields.folder ? hashr.unhashOid(fields.folder) : null;

  };
  this.vault_fileId = function () {
    return [this._folder, this._owner, this.chunkId].join('-');
  };

}

/* Common methods for file upload operation*/
var vFunc = {
  /**
   * saves an uploaded file chunk object to the database
   * @param  {Object} props chunk object.
   * @return {Promise}       Promise
   */
  saveChunkToDB: function saveChunkToDB (prop) {
    var q = Q.defer();
    var utility = new Utility();

    var q = Media.findOne({'owner': prop.owner, 'visible':1});
    q.where('identifier', prop.identifier);
    q.exec(function(err, foundDoc ){
      if(_.isNull(foundDoc)){
        var media = new Media(prop);
        media.mediaNumber = utility.mediaNumber();
        media.save(function(err, foundDoc){
          if(err){
            q.reject(err);
          }else{
            foundDoc.index(function(err){
              if(!err){
                q.resolve(foundDoc);
              }
            });
          }
        });
      }else{
        Media.update({_id: foundDoc._id}, prop, function(err){
          if(err){
            q.reject(err);
          }else{
            q.resolve(foundDoc);
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
  checkFolder: function checkFolder (data) {
    var q = Q.defer();


    var cabinet = new Cabinet();
    if (!data.folder) {
      cabinet.createFolder({
        name: data.name || 'Home',
        owner: data.owner,
        fileId: data.fileId,
        type: (data.parent) ? 'sub': 'root'
      }, function(r){
        data.folder = r._id;
        q.resolve(data);
      });
    } else {
      q.resolve(data);
    }
    return q.promise;
  },
  joinCompletedFileUpload: function joinCompletedFileUpload (self) {
    var q = Q.defer();
    var fm = new Fm();

    if(self._chunkNumber === self._totalChunks){
      //Create writeableStream.
      //Happens ONCE. after ^
      var filepath = path.join(process.cwd(), 'v4nish', self.vault_fileId());
      var stream = fs.createWriteStream(filepath);

      //Run the $.write method
      fm.write(self.vault_fileId(), stream, function(){
        //re-index es
        syncIndex();

        q.resolve(self);
      });

    }else{
      q.resolve(self);
    }
    return q.promise;
  },
  saveChunkToRedis: function saveChunkToRedis () {

  },
  deleteTemp: function deleteTemp (self) {
    var q = Q.defer();
    var fm = new Fm();
    if(self._chunkNumber === self._totalChunks){
      fm.deleteTemp(self.vault_fileId(), self._owner, function(f){
        console.log(f === true ? 'Delete Completed': 'Error Deleting');
      });
    }else{
      q.resolve(self);
    }
    return q.promise;
  },
  prepareResult: function prepareResult () {

  },
  moveFile: function moveFile (args) {
    var q = Q.defer();
    var fm = new Fm();
    var files = args[0],
        self = args[1];

    // Save the chunk (TODO: OVERWRITE)
    fs.rename(
      files[self.fileParameterName].path,
      fm.getChunkFilePath(self._chunkNumber, self.vault_fileId()),
      function(){
        var tosaveObj = {
          progress: self._chunkNumber,
          identifier: self.vault_fileId(),
          filename: self._filename,
          size: self._totalSize,
          chunkCount: self._totalChunks,
          sum : self._sum,
          owner: self._owner,
          type: self._filetype,
          folder: self._folder,
          chunkId: self.chunkId,
          completedDate: self._chunkNumber === self._totalChunks ? Date.now() : ''
        };
        q.resolve(tosaveObj);
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

  vFunc.moveFile([files, self])
  .then(vFunc.checkFolder)
  .then(vFunc.joinCompletedFileUpload)
  .then(vFunc.saveChunkToRedis)
  .then(function () {
    return vFunc.saveChunkToDB();
  })
  .then(vFunc.deleteTemp)
  .then(vFunc.prepareResult)
  .done(function (r) {
    q.resolve(r);
  })
  .catch(function (err) {
    console.log(err.stack);
    q.reject(errors.nounce('UploadHasError'));
  });

  return q.promise;
};
// V4ult.prototype.postHandler = function (fields, files, callback){
//   var fm = new Fm(), utility = new Utility();
//   var eventRegister = new EventRegister();
//   var self = this;

//   self.setFields(fields);

//   eventRegister.on('checkFolder', function(data, isDone){

//   });

//   eventRegister.on('saveFile', function(data, isDone){
//     // if(parseInt(data.chunkNumber) === 1 || chunkNumber === totalChunks){
//       //TODO:: log file save / upload completed
//       //This saves the file record and just outputs the saved object
//       //isDone is called so the upload can process without
//       //waiting for the save method to complete.
//       //
//       //if the upload is complete..return the saved
//       //upload document.
//       if (self._chunkNumber === self._totalChunks) {
//         console.log('Download finished...'.green);
//         // process.nextTick(function() {
//           self.save(data, function(i){

//               isDone(i);
//           });
//         // });
//       } else {
//         //call save method
//         process.nextTick(function() {
//           self.save(data, function(i){
//             // util.puts(i);
//           });
//         });
//         //Continue the upload process
//         //without blocking the save.
//         isDone(data);
//       }

//   });

//   //joins the chunks of file uploaded into
//   //one file after all chunks have been
//   //uploaded.
//   eventRegister.on('write', function(data, isDone){
//     // if(self._chunkNumber === self._totalChunks){
//     //   //Create writeableStream.
//     //   //Happens ONCE. after ^
//     //   var filepath = path.join(process.cwd(), 'v4nish', self.vault_fileId());
//     //   var stream = fs.createWriteStream(filepath);

//     //   //Run the $.write method
//     //   fm.write(self.vault_fileId(), stream, function(){
//     //     //re-index es
//     //     syncIndex();

//     //     isDone(data);
//     //   });

//     // }else{
//     //   isDone(data);
//     // }
//   });

//   eventRegister.on('deleteTemp', function(data, isDone){
//     // //Runs after the last chunk has been piped
//     // //Deletes all temporary files
//     // return isDone(data);
//     // if(self._chunkNumber === self._totalChunks){
//     //   fm.deleteTemp(self.vault_fileId(), self._owner, function(f){
//     //     console.log(f === true ? 'Delete Completed': 'Error Deleting');
//     //   });
//     // }else{
//     //   isDone(data);
//     // }
//   });

//   eventRegister.on('moveFile', function(data, isDone){
//     // Save the chunk (TODO: OVERWRITE)
//     // fs.rename(
//     //   files[self.fileParameterName].path,
//     //   fm.getChunkFilePath(self._chunkNumber, self.vault_fileId()),
//     //   function(){
//     //     var tosaveObj = {
//     //       progress: self._chunkNumber,
//     //       identifier: self.vault_fileId(),
//     //       filename: self._filename,
//     //       size: self._totalSize,
//     //       chunkCount: self._totalChunks,
//     //       sum : self._sum,
//     //       owner: self._owner,
//     //       type: self._filetype,
//     //       folder: self._folder,
//     //       chunkId: self.chunkId,
//     //       completedDate: self._chunkNumber === self._totalChunks ? Date.now() : ''
//     //     };
//     //     isDone(tosaveObj);
//     // });
//   });

//   if(!files[self.fileParameterName] || !files[self.fileParameterName].size) {
//     callback(errors.nounce('UploadHasError'));
//     //callback(3, null, null, null);
//     return;
//   }

//   var validation = fm.validateRequest(self._chunkNumber, self._chunkSize, self._totalSize, self.vault_fileId(), files[self.fileParameterName].size);

//   if(validation === 'valid') {

//     var chunkFilename = fm.getChunkFilePath(self._chunkNumber, self.vault_fileId());

//     eventRegister
//     .queue('moveFile', 'checkFolder', 'write', 'saveFile', 'deleteTemp')
//     .onEnd(function(r){
//       callback(r);
//     })
//     .onError(function(err){
//       // console.log(err.stack);
//       callback(errors.nounce('UploadHasError'));
//     })
//     .start(chunkFilename);

//   } else {
//         callback(validation);
//         //callback(validation, filename, original_filename, identifier);
//   }
// };

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