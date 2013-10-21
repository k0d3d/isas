var Utility = require('../../lib/utility.js');
var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Stream = require('stream').Stream,
    mongoose = require("mongoose"),
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
function _save(prop, callback){
  var q = Media.findOne({"owner": prop.owner});
  q.where("identifier", prop.identifier);
  q.exec(function(err, i ){
    if(_.isNull(i)){
      var media = new Media(prop);
      media.save(function(err, i){
        if(err){
          callback(err);
        }else{
          callback(i);
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
}


function _deleteTemp(identifier,userId,  callback){
  var utility = new Utility();
  var options = {onDone: function(){
    callback(true);
  } };
  utility.clean(identifier,userId, options);
}



/**
 * [_postHandler Handles all chunk post request and send response when complete ]
 * @param  {[type]}   req      [Request Body]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function _postHandler (req, callback){
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
  var totalChunks = fields['resumableTotalChunks'];
  var sum = fields['sum'];
  var filetype = fields['fileType'];
  var owner = fields['throne'];

  if(!files[self.fileParameterName] || !files[self.fileParameterName].size) {
    callback(3);
    //callback(3, null, null, null);
    return;
  }
  var validation = utility.validateRequest(chunkNumber, chunkSize, totalSize, identifier, files[self.fileParameterName].size);
  if(validation=='valid') {

    var chunkFilename = utility.getChunkFilename(chunkNumber, identifier, owner);
    if(_.indexOf(self.chunkList, chunkFilename) === -1){
      self.chunkList.push(chunkFilename);
    }
    
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
          completedDate: chunkNumber === totalChunks ? Date.now() : ''
        };
      process.nextTick(function(){
        _save(tosaveObj, function(k){
          if(chunkNumber === 1 || chunkNumber === totalChunks){

          }
        });
      });
      //Try to save 
      //if(chunkNumber === 1 || chunkNumber === totalChunks){
      //}
      // Do we have all the chunks?
      var currentTestChunk = 1;
      var numberOfChunks = Math.max(Math.floor(totalSize/(chunkSize*1.0)), 1);
      var testChunkExists = function(){
            fs.exists(utility.getChunkFilename(currentTestChunk, identifier, owner), function(exists){
              if(exists){
                currentTestChunk++;

                if(currentTestChunk>numberOfChunks) {
                  //Create writeableStream
                  var stream = fs.createWriteStream('./v4nish/'+identifier);

                  //Run the $.write method
                  utility.write(identifier, stream, owner, function(s){
                    //Runs after the last chunk has been piped
                    //Deletes all temporary files
                    if(chunkNumber === totalChunks){
                      _deleteTemp(identifier, owner, function(f){
                        console.log(f === true ? 'Delete Completed': 'Error Deleting');
                      });
                    }
                    callback(1);
                  });

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
function _getHandler (req, res){
  var utility = new Utility();
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    var chunkNumber = req.param('resumableChunkNumber', 0);
    var chunkSize = req.param('resumableChunkSize', 0);
    var totalSize = req.param('resumableTotalSize', 0);
    var identifier = req.param('resumableIdentifier', "");
    var filename = req.param('resumableFilename', "");
    var owner = req.param('throne', "");

    if(utility.validateRequest(chunkNumber, chunkSize, totalSize, identifier, filename)=='valid') {
      var chunkFilename = utility.getChunkFilename(chunkNumber, identifier, owner);
      console.log(chunkFilename);
      fs.exists(chunkFilename, function(exists){
        console.log(exists);
          if(exists){
            res.json(200, {"chunkFilename": chunkFilename, "filename": filename, "identifier": identifier});
          } else {
            res.json(404, {});
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


function _deleteFile(req, res, next){
  var identifier = req.body.identifier;
  fs.exists('./v4nish/'+identifier, function(exists){
    if(exists){
      fs.unlink('./v4nish/'+identifier, function(r){
        if(util.isError(r)){
          next(err);
        }else{
          res.json(200);
        }
      });
    }
  })
}

//V4ult Object
V4ult.prototype = {
  constructor: V4ult,
  postHandler: _postHandler,
  getHandler: _getHandler,
  optionsHandler : _optionsHandler,
  save : _save
};

exports.v4ult = V4ult;

var v4ult = new V4ult();

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