var fs = require('fs'),
    path = require('path');

    function utility(){

    }

    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
                 .toString(16)
                 .substring(1);
    }

    utility.prototype.uuid = function(){
        return s4() + s4() + '-' + s4() + s4()+'-'+s4();
    };

    var temporaryFolder = './temp';
    var maxFileSize = null;


    try {
      fs.mkdirSync(temporaryFolder);
    }catch(e){
    }


    utility.prototype.cleanIdentifier = function(identifier){
      return identifier;
    };

    utility.prototype.getChunkFilename = function(chunkNumber, identifier, userId){
      // Clean up the identifier
      identifier = this.cleanIdentifier(identifier);
      // What would the file name be?
      return path.join(temporaryFolder, './'+chunkNumber+'.'+'resumable-'+identifier+'.'+userId);
    };

    utility.prototype.validateRequest = function(chunkNumber, chunkSize, totalSize, identifier, filename, fileSize){
      // Clean up the identifier
      identifier = this.cleanIdentifier(identifier);

      // Check if the request is sane
      if (chunkNumber===0 || chunkSize===0 || totalSize===0 || identifier.length===0 || filename.length===0) {
        return 'non_resumable_request';
      }
      var numberOfChunks = Math.max(Math.floor(totalSize/(chunkSize*1.0)), 1);
      if (chunkNumber>numberOfChunks) {
        return 'invalid_resumable_request1';
      }

      // Is the file too big?
      if(maxFileSize && totalSize>maxFileSize) {
        return 'invalid_resumable_request2';
      }

      if(typeof(fileSize)!='undefined') {
        if(chunkNumber<numberOfChunks && fileSize!=chunkSize) {
          // The chunk in the POST request isn't the correct size
          return 'invalid_resumable_request3';
        }
        if(numberOfChunks>1 && chunkNumber==numberOfChunks && fileSize!=((totalSize%chunkSize)+chunkSize)) {
          // The chunks in the POST is the last one, and the fil is not the correct size
          return 'invalid_resumable_request4';
        }
        if(numberOfChunks==1 && fileSize!=totalSize) {
          // The file is only a single chunk, and the data size does not fit
          return 'invalid_resumable_request5';
        }
      }

      return 'valid';
    };

    utility.prototype.write = function(identifier, writableStream, userId, callback) {
      var self = this;
        
        // options = options || {};
        // options.end = (typeof options['end'] == 'undefined' ? true : options['end']);
        // options.onDone = function(){
        //   console.log('Yes its all done');
        // };

        // Iterate over each chunk
        var pipeChunk = function(number) {

            var chunkFilename = self.getChunkFilename(number, identifier, userId);
            fs.exists(chunkFilename, function(exists) {

                if (exists) {
                  console.log('yes');
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
    }

    utility.prototype.clean = function(identifier, userId, options) {
      var self = this;
      options = options || {};

      // Iterate over each chunk
      var pipeChunkRm = function(number) {

          var chunkFilename = self.getChunkFilename(number, identifier, userId);

          console.log('removing pipeChunkRm ', number, 'chunkFilename', chunkFilename);
          fs.exists(chunkFilename, function(exists) {
              if (exists) {

                  console.log('exist removing ', chunkFilename);
                  fs.unlink(chunkFilename, function(err) {
                      if (options.onError) options.onError(err);
                  });

                  pipeChunkRm(number + 1);

              } else {

                  if (options.onDone) options.onDone();

              }
          });
      }
      pipeChunkRm(1);
  }

module.exports = utility;