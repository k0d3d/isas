/**
 * Module dependencies.
 */
var db = require("../../lib/db.js")
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto'),
    _ = require('underscore'),
    authTypes = ['twitter', 'facebook', 'google'],
    uniqueValidator = require('mongoose-unique-validator');

var MediaSchema = new Schema({
	filename: {type:String, required: true},
	startedDate: {type: Date, default: Date.now},
	downloadCount: {type: Number, default: 0},
	identifier: {type:String, required: true},
	owner: {type: String, default: 'anonymous'},
	progress: Number,
	chunkCount: Number,
	visible: Number,
	type: {type: String, required: true},
	size: {type: Number, required: true},
	completedDate: {type: Date},
});

/*
Media Statics
 */

MediaSchema.statics = {
	userFiles : function(userId, options, callback){
		var thisOptions = {

		};
		this.find({"owner": userId, $where: function(){
			return this.progress === this.chunkCount;
		}}, function(err, i){
			if(err){
				callback(err);
			}else{
				callback(i);
			}
		});
	},
	countUserFiles : function(userId, callback){
		this.count({"owner": userId}, function(err, count){
			if(err){
				callback(err);
			}else{
				callback(count);
			}
		})
	},
	userQueue : function(userId, options, callback){
		var thisOptions = {

		};
		this.find({"owner": userId, $where: function(){
			return this.progress < this.chunkCount;
			} 
		}, function(err, i){
			if(err){
				callback(err);
			}else{
				callback(i);
			}
		})
	}
}

mongoose.model('Media', MediaSchema);
module.exports = mongoose.model('Media');