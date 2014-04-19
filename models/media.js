/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    _ = require('underscore'),
    authTypes = ['twitter', 'facebook', 'google'],
    mongoosastic = require('mongoosastic'),
    config = require('config'),
    uniqueValidator = require('mongoose-unique-validator');


var MediaSchema = new Schema({
	filename: {type:String, required: true, es_indexed:true, es_boost:2.0},
	startedDate: {type: Date, default: Date.now},
	downloadCount: {type: Number, default: 0},
	identifier: {type:String, required: true, unique: true},
	owner: {type: String, default: 'anonymous'},
	progress: Number,
	chunkCount: Number,
	visible: {type: Number, default: 1},
	type: {type: String, required: true},
	size: {type: Number, required: true},
	completedDate: {type: Date, es_type:'date'},
	mediaNumber: {type: Number},
	tags:{type: String, index: true, es_indexed:true},
	folder: {type: Schema.ObjectId, ref: 'Folder'}
});

/**
* {name} name of the folder
* {type} root or child folder
* {parent} parent folder or the folder 'this' belongs to
* {visible} Sharing boolean
* {files} the files contained in this folder
* {created} the date 'this' is created
 * @type {Schema}
 */
var FolderSchema = new Schema({
	name: {type: String, required: true, es_indexed:true},
	type: {type: String, default: 'root'},
	parent:{type: Schema.ObjectId},
	folderId: {type: String, unique: true},
	owner: {type: String},
	visible: {type: Number, default: 1},
	created: {type: Date, default: Date.now}
});
/*
Media Statics
 */

MediaSchema.statics = {
	userFiles : function(userId, options, callback){

		this.find({
			'owner': userId, 
			$where: function(){
				return (this.progress === this.chunkCount) && this.visible === 1;
			},
			folder: options.folder
		}, 
		function(err, i){
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
		});
	},
	/**
	 * [one Returns data on a file. ]
	 * @param  {[type]}   media_id  [description]
	 * @param  {Function} callback [description]
	 * @return {[type]}            [description]
	 */
	one : function(media_id, callback){
		var q;
		if(/^[0-9a-fA-F]{24}$/.test(media_id)){
			q = {"_id": media_id}; 
		}else{
			q = {"mediaNumber": media_id};
		}
		this.findOne(q, function(err, i){
			if(err){
				callback(err);
			}else{
				callback(i);
			}
		});
	}
};

MediaSchema.plugin(mongoosastic, {
	host: config.es.url,
	port: config.es.port,
	hydrate: true, 
	hydrateOptions:{
		select: 'mediaNumber size filename completedDate'
	}
});

mongoose.model('Media', MediaSchema);
mongoose.model('Folder', FolderSchema);
module.exports.Media = mongoose.model('Media');
module.exports.Folder = mongoose.model('Folder');