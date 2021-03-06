var fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    u = require('./utility'),
    util = require('util'),
    errors = require('./errors'),
    debug = require('debug')('dkeep'),
    Q = require('q');

function FileManagerFn () {
  //var APPCHUNKDIR = "./temp";
  this.SYSTEMTEMPDIR = process.env.TMPDIR || process.env.TMP || process.env.TEMP;
  this.APPCHUNKDIR = path.join(process.cwd(), 'chunks');
  this.FILESTORAGEDIR = path.join(process.cwd(), 'storage');
  this.maxFileSize = null;

  this.vault_fileId = function (fileParams) {
    return [fileParams.folder, fileParams.owner, fileParams.chunkId || fileParams.filename, fileParams.totalSize].join('-');
  };

  this.setFields = function setFields (fields) {
    var self = {};
    self.chunkNumber = fields.flowChunkNumber;
    self.chunkSize = fields.flowChunkSize;
    self.totalSize = fields.flowTotalSize;
    self.chunkId = u.cleanIdentifier(fields.flowIdentifier);
    self.filename = fields.flowFilename;
    // self._original_filename = fields.flowIdentifier;
    self.totalChunks = fields.flowTotalChunks;
    self.sum = fields.sum;
    self.filetype = mime.lookup(fields.flowFilename);
    self.owner = fields['x-Authr'] || fields['x-authr'] || 'anonymous';
    self.folder = fields.folder;
    return self;
  };

  try {
    fs.mkdirSync(this.APPCHUNKDIR);
    fs.mkdirSync(this.FILESTORAGEDIR);
    fs.mkdirSync(this.SYSTEMTEMPDIR);
  }catch(e){
    if ( e.code !== 'EEXIST') {
      debug(e);
    }
  }
}

FileManagerFn.prototype.getChunkFilePath = function(chunkNumber, identifier){
  // Clean up the identifier
  identifier = u.cleanIdentifier(identifier);
  // What would the file name be?
  return path.join(this.APPCHUNKDIR, chunkNumber+'.'+'resumable-'+identifier);
};

FileManagerFn.prototype.validateRequest = function(chunkNumber, chunkSize, totalSize, identifier, filename, fileSize){
  // Clean up the identifier
  identifier = u.cleanIdentifier(identifier);

  // Check if the request is sane
  if (parseInt(chunkNumber)===0 || parseInt(chunkSize)===0 || parseInt(totalSize)===0 || identifier.length===0 || filename.length===0) {
    return 'non_resumable_request';
  }
  var numberOfChunks = Math.max(Math.floor(totalSize/(chunkSize*1.0)), 1);
  if (chunkNumber>numberOfChunks) {
    return 'invalid_resumable_request1';
  }

  // Is the file too big?
  if(this.maxFileSize && totalSize > this.maxFileSize) {
    return 'invalid_resumable_request2';
  }

  if(typeof(fileSize) !== 'undefined') {
    if(chunkNumber<numberOfChunks && fileSize!== chunkSize) {
      // The chunk in the POST request isn't the correct size
      return 'invalid_resumable_request3';
    }
    if(numberOfChunks>1 && chunkNumber ===numberOfChunks && fileSize!== ((totalSize%chunkSize)+chunkSize)) {
      // The chunks in the POST is the last one, and the fil is not the correct size
      return 'invalid_resumable_request4';
    }
    if(numberOfChunks === 1 && fileSize!== totalSize) {
      // The file is only a single chunk, and the data size does not fit
      return 'invalid_resumable_request5';
    }
  }

  return 'valid';
};

/**
 * saves a file that has been completely uploaded to the
 * upload folder stated. It serialy loops over chunks of
 * the file in the temp. (APPCHUNKDIR) directory each time
 * piping each chunk to the final final using a writable stream.
 * @param  {string}   identifier     the server file Id/name
 * which will be used to produce each chunk filename
 * @param  {object}   writableStream the final and completely uploaded file.
 * this should be a file stream.
 * @param  {Function} callback       A function to be called when this process
 * is complete
 * @return {[type]}                  Function / Object
 */
FileManagerFn.prototype.write = function(fileObj, writableStream) {
  var self = this;
  var q = Q.defer();
  // Iterate over each chunk
  var pipeChunkWrite = function(number) {

    var chunkFilename = self.getChunkFilePath(number, fileObj.identifier);
    fs.exists(chunkFilename, function(exists) {
        if (exists) {
            // If the chunk with the current number exists,
            // then create a ReadStream from the file
            // and pipe it to the specified writableStream.
            var sourceStream = fs.createReadStream(chunkFilename);
            sourceStream.pipe(writableStream, {
                end: false
            });
            sourceStream.on('end', function() {
                // When the chunk is fully streamed,
                // jump to the next one
                pipeChunkWrite(number+ 1);
            });
        } else {
            // When all the chunks have been piped, end the stream
            if (fileObj.progress === fileObj.chunkCount) {
              return q.resolve(true);
            } else {
              return q.reject(errors.nounce('OperationHasErrors'));
            }

        }
    });
  };
  //Starts piping chunks
  pipeChunkWrite(1);
  return q.promise;
};

/**
 * removes the file parts / chunks of a completed upload
 * from the 'chunkDir' directory where file parts/ chunks
 * are saved.
 * @param  {[type]} fileObj [description]
 * @param  {[type]} userId  [description]
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
FileManagerFn.prototype.clean = function(fileObj, userId, options) {
  var self = this;
  var q = Q.defer(), deleteErrors = 0;
  options = options || {};

  // Iterate over each chunk
  var pipeChunkRm = function(number) {

      var chunkFilename = self.getChunkFilePath(number, fileObj.identifier);

      if(fileObj.progress != fileObj.chunkCount){
        return q.resolve(false);
      }
      fs.exists(chunkFilename, function(exists) {
          if (exists) {

              fs.unlink(chunkFilename, function(err) {
                  if (err){
                    debug(err);
                    deleteErrors++;
                    // return q.reject(errors.nounce('OperationFailed'));
                  }
                  pipeChunkRm(number + 1);
              });


          } else {
            // if the specific file chunk doesnt exist on the disk
            deleteErrors++;
            debug('Deleting: Chunk not found or operation completed; end reached');
            // check if there are other chunks to delete.
            if (fileObj.progress === fileObj.chunkCount) {
              if (deleteErrors === 1) {
                return q.resolve(true);
              } else {
                return q.reject(errors.nounce('OperationHasErrors'));
              }
            } else {
              //continue to recurse
              pipeChunkRm(number + 1);
            }

          }
      });
  };
  pipeChunkRm(1);
  return q.promise;
};

FileManagerFn.prototype.deleteTemp =  function (identifier,userId,  callback){
  // var utility = new Utility();
  var options = {onDone: function(){
    callback(true);
  } };
  this.clean(identifier,userId, options);
};

/**
 * remove a completely uploaded file from the disk
 * @param  {[type]}   identifier [description]
 * @param  {Function} callback   [description]
 * @return {[type]}              [description]
 */
FileManagerFn.prototype.delete = function (identifier, callback){
  // var filepath = path.join(process.env.APP_HOME, config.app.home, 'v4nish', identifier);
  var filepath = path.join(this.FILESTORAGEDIR, identifier);
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

FileManagerFn.prototype.moveUpload = function moveUpload (reqObject) {

}

module.exports = FileManagerFn;

