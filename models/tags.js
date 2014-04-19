/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var TagSchema = new Schema({
	name:{type: String}
});

mongoose.model('Tag', TagSchema);
module.exports = mongoose.model('Tag');