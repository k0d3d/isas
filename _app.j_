var express = require('express');
var resumable = require('./resumable-node.js');
var app = express();
var fs = require('fs');

// Host most stuff in the public folder
//app.use(express.static(__dirname + '/public'));
app.use(express.logger());
app.use(express.bodyParser());

app.use(function(req, res, next){
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  next();
});

// Handle uploads through Resumable.js
app.post('/upload', function(req, res){
    console.log(req.body);
    console.log(req.files);
    return;
    resumable.post(req, function(status, filename, original_filename, identifier){
      console.log('POST', status, original_filename, identifier);
      //CORS Headers
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "X-Requested-With");

      //Send appoproiate response
      if(status === 1){
        res.json(200, {status: 'done'});
      }else if(status === 2){
        res.send(200, {status: 'inprogress'});
      }else{
        res.json(400);
      }

      //Create writeableStream
      // var stream = fs.createWriteStream('./v4nish/'+filename);

      // //Run the $.write method
      // resumable.write(identifier, stream);

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
    });
});

// Handle cross-domain requests
// NOTE: Uncomment this funciton to enable cross-domain request.

  app.options('/upload', function(req, res){
    console.log('OPTIONS');
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.send(true, {
    'Access-Control-Allow-Origin': '*'
    }, 200);
  });


// Handle status checks on chunks through Resumable.js
app.get('/upload', function(req, res){
    resumable.get(req, function(status, filename, original_filename, identifier){
        console.log('GET', status);
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");        
        res.send(status, (status == 'found' ? 200 : 404));
      });
  });

app.get('/download/:identifier', function(req, res){
  resumable.write(req.params.identifier, res);
});

app.get('/resumable.js', function (req, res) {
  var fs = require('fs');
  res.setHeader("content-type", "application/javascript");
  fs.createReadStream("resumable.js").pipe(res);
});

app.listen(3000);
console.log('IXIT File Server Started on port:'+ 3000);