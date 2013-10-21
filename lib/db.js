// Load configurations
// if test env, load example file
var env = process.env.NODE_ENV || 'development';
//var config = require('../config/config')[env];
var mongoose = require('mongoose');

var config = {
  port: process.env.PORT || 80,
  db: process.env.MONGO_URL || "mongodb://localhost/ixit"
}

// Bootstrap db connection
if(!mongoose.connection.readyState){
  console.log(config.db);
	mongoose.connect(config.db);
}

mongoose.connection.on('connected', function(){
  console.log("DB Connected");
  
});


// If the connection throws an error
mongoose.connection.on('error',function (err) {
  console.log(err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});



// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});

module.exports = mongoose;

