var Utility = require('../lib/utility.js');
var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Stream = require('stream').Stream,
    Media = mongoose.model('Media');
    _ = require("underscore");
//V4ult Class
function V4ult(){
  this.fileParameterName = 'file';
  this.uuid = '';
  this.chunkList = [];
}

/**
 * [save Saves a file and it upload progress]
 * @param  {[type]}   prop     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function save(prop, callback){

}


/**
 * [_postHandler Handles all chunk post request and send response when complete ]
 * @param  {[type]}   req      [Request Body]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function _postHandler (req, callback){
  console.log(req.body);
  return;
  var utility = new Utility();
  var fields = req.body;
  var files = req.files;

  var self = this;

  var chunkNumber = fields['resumableChunkNumber'];
  var chunkSize = fields['resumableChunkSize'];
  var totalSize = fields['resumableTotalSize'];
  var identifier = utility.cleanIdentifier(fields['resumableIdentifier']);
  var filename = fields['resumableFilename'];
  var original_filename = fields['resumableIdentifier'];

  if(!files[self.fileParameterName] || !files[self.fileParameterName].size) {
    callback(3);
    //callback(3, null, null, null);
    return;
  }
  var validation = utility.validateRequest(chunkNumber, chunkSize, totalSize, identifier, files[self.fileParameterName].size);
  if(validation=='valid') {

    var chunkFilename = utility.getChunkFilename(chunkNumber, identifier);
    if(_.indexOf(self.chunkList, chunkFilename) === -1){
      self.chunkList.push(chunkFilename);
    }
    
    // Save the chunk (TODO: OVERWRITE)
    fs.rename(files[self.fileParameterName].path, chunkFilename, function(){
      save({
        progress: chunkNumber,
        identifier: identifier,
        filename: filename,
        size: totalSize,
        chunkCount: 
      });

      // Do we have all the chunks?
      var currentTestChunk = 1;
      var numberOfChunks = Math.max(Math.floor(totalSize/(chunkSize*1.0)), 1);
      var testChunkExists = function(){
            fs.exists(utility.getChunkFilename(currentTestChunk, identifier), function(exists){
              if(exists){
                currentTestChunk++;

                if(currentTestChunk>numberOfChunks) {
                  //Sort it
                  self.chunkList.sort(function(a,b){
                    return a - b;
                  });

                  //Create writeableStream
                  var stream = fs.createWriteStream('./v4nish/'+identifier);

                  //Run the $.write method
                  utility.write(identifier, stream, function(s){
                    console.log(self.chunkList);
                    callback(1);                    
                  });

                  // //Emit event when data is received
                  // stream.on('data', function(data){
                  //   console.log('got data');
                  // });

                  // //Emit when stream has ended
                  // stream.on('end', function(){
                  //   console.log('end');
                  // });


                  // res.send(200, {
                  //     // NOTE: Uncomment this funciton to enable cross-domain request.
                  //     'Access-Control-Allow-Origin': '*'
                  // });

                  //callback(1, filename, original_filename, identifier);
                } else {
                  // Recursion
                  testChunkExists();
                }
              } else {
                callback(2);
                //callback(2, filename, original_filename, identifier);
              }
            });
          }
      testChunkExists();
    });
  } else {
        callback(validation);
        //callback(validation, filename, original_filename, identifier);
  }
}

/**
 * [_getHandler used to check validity of chunks for cross session resumable uploads]
 * @param  {[type]}   req      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function _getHandler (req, callback){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    var chunkNumber = req.param('resumableChunkNumber', 0);
    var chunkSize = req.param('resumableChunkSize', 0);
    var totalSize = req.param('resumableTotalSize', 0);
    var identifier = req.param('resumableIdentifier', "");
    var filename = req.param('resumableFilename', "");

    if(validateRequest(chunkNumber, chunkSize, totalSize, identifier, filename)=='valid') {
      var chunkFilename = getChunkFilename(chunkNumber, identifier);
      fs.exists(chunkFilename, function(exists){
          if(exists){
            res.json(200, {"chunkFilename": chunkFilename, "filename": filename, "identifier": identifier});
          } else {
            res.json(404);
          }
        });
    } else {
      res.json(404);
    }
}

function _optionsHandler (req, res){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.send(true, {
    'Access-Control-Allow-Origin': '*'
  }, 200);
}

//V4ult Object
V4ult.prototype = {
  constructor: V4ult,
  postHandler: _postHandler,
  getHandler: _getHandler,
  optionsHandler : _optionsHandler
};

var v4ult = new V4ult();

exports.v4ult = v4ult;

exports.routes = function(app){
  // Handle uploads through Resumable.js
  app.post('/upload', function(req, res){
      //CORS Headers
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "X-Requested-With");
      v4ult.postHandler(req, function(status){
        //Send appoproiate response
        if(status === 1){
          res.json(200, {status: 'done'});
        }else if(status === 2){
          res.send(200, {status: 'inprogress'});
        }else{
          res.json(400);
        }
      })
  });

  // Handle cross-domain requests
  // NOTE: Uncomment this funciton to enable cross-domain request.

  app.options('/upload', v4ult.optionsHandler);


  // Handle status checks on chunks through Resumable.js
  app.get('/upload', v4ult.getHandler);

  // app.get('/download/:identifier', function(req, res){
  //   resumable.write(req.params.identifier, res);
  // });

  // app.get('/resumable.js', function (req, res) {
  //   var fs = require('fs');
  //   res.setHeader("content-type", "application/javascript");
  //   fs.createReadStream("resumable.js").pipe(res);
  // });  
}