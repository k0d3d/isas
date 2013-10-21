/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto'),
    _ = require('underscore'),
    uniqueValidator = require('mongoose-unique-validator');

var ClientSchema = new Schema ({
	clientID : {type: String}
});

mongoose.model('Client', ClientSchema);
