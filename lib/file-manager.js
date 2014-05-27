var fs = require('fs'),
    path = require('path'),
    Utility = require('./utility.js'),
    util = require('util'),
    config = require('config');

function FileManagerFn () {
  //var temporaryFolder = "./temp";
  this.temporaryFolder = path.join(process.env.APP_HOME, config.app.home, 'temp');
  this.maxFileSize = null;
  this.u = function (){
    return new Utility();
  };


  try {
    fs.mkdirSync(this.temporaryFolder);
  }catch(e){

    console.log('temp folder created');
  }
}

FileManagerFn.prototype.getChunkFilePath = function(chunkNumber, identifier){
  // Clean up the identifier
  identifier = this.u().cleanIdentifier(identifier);
  // What would the file name be?
  return path.join(this.temporaryFolder, '/'+chunkNumber+'.'+'resumable-'+identifier);
};

FileManagerFn.prototype.validateRequest = function(chunkNumber, chunkSize, totalSize, identifier, filename, fileSize){
  // Clean up the identifier
  identifier = this.u().cleanIdentifier(identifier);

  // Check if the request is sane
  if (chunkNumber===0 || chunkSize===0 || totalSize===0 || identifier.length===0 || filename.length===0) {
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
 * the file in the temp. (temporaryFolder) directory each time
 * piping each chunk to the final final using a writable stream.
 * @param  {string}   identifier     the server file Id/name 
 * which will be used to produce each chunk filename
 * @param  {object}   writableStream the final and completely uploaded file.
 * this should be a file stream.
 * @param  {Function} callback       A function to be called when this process
 * is complete
 * @return {[type]}                  Function / Object
 */
FileManagerFn.prototype.write = function(identifier, writableStream, callback) {
  var self = this;
    
    // options = options || {};
    // options.end = (typeof options['end'] == 'undefined' ? true : options['end']);
    // options.onDone = function(){
    //   console.log('Yes its all done');
    // };

    // Iterate over each chunk
    var pipeChunk = function(number) {

        var chunkFilename = self.getChunkFilePath(number, identifier);
        fs.exists(chunkFilename, function(exists) {
            console.log(exists);
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
                    pipeChunk(number+ 1);
                });
            } else {
                // When all the chunks have been piped, end the stream
                callback(true);
                //if (options.end) writableStream.end();
                //if (options.onDone) options.onDone();
            }
        });
    };
    //Starts piping chunks
    pipeChunk(1);
};

FileManagerFn.prototype.clean = function(identifier, userId, options) {
  var self = this;
  options = options || {};

  // Iterate over each chunk
  var pipeChunkRm = function(number) {

      var chunkFilename = self.getChunkFilePath(number, identifier);

      fs.exists(chunkFilename, function(exists) {
          if (exists) {

              fs.unlink(chunkFilename, function(err) {
                  if (options.onError){ options.onError(err);}
              });

              pipeChunkRm(number + 1);

          } else {

              if (options.onDone){ options.onDone();}

          }
      });
  };
  pipeChunkRm(1);
};

FileManagerFn.prototype.deleteTemp =  function (identifier,userId,  callback){
  // var utility = new Utility();
  var options = {onDone: function(){
    callback(true);
  } };
  this.clean(identifier,userId, options);
};

FileManagerFn.prototype.delete = function (identifier, callback){
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

module.exports = FileManagerFn;

