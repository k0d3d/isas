/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    mongoosastic = require('mongoosastic'),
    config = require('config'),
    hashr = require('../../lib/hash.js');

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
	mediaNumber: {type: String},
	tags:{type: String, index: true, es_indexed:true},
  chunkId: {type: String},
	folder: {type: Schema.ObjectId, ref: 'Folder'},
  relativePath: {type: String}
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
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
}, {
  toObject: { virtuals: true, getters: true },
  toJSON: { virtuals: true, getters: true }
});

/**
 * Virtuals, Getters & Setters
 */
FolderSchema.virtual('fid')
.get(function () {
	return hashr.hashOid(this._id.toString());
	// return 'main street';
});

MediaSchema.virtual('ixid')
.get(function () {
	return hashr.hashInt(this.mediaNumber);
});

MediaSchema.path('folder')
.get(function (v) {
	return hashr.hashOid(v.toString());
});

FolderSchema.path('parent')
.get(function (v) {
	if (v) {
		return hashr.hashOid(v.toString());
	} else {
		return '';
	}
});

/*
Media Statics
 */

MediaSchema.statics = {
	userFiles : function(userId, options, callback){

		var q = this.find({
			'owner': userId,
			$where: function(){
				return (this.progress === this.chunkCount) && this.visible === 1;
			},
			// folder: options.folder
		});
    q.sort({'completedDate' : -1});
		q.exec(function(err, i){
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
		});
	},
	userQueue : function(userId, options, callback){

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

/**
 * plugin
 */
var ESURL = require('url').parse(process.env.ES_SSL_URL || process.env.ES_URL);

MediaSchema.plugin(mongoosastic, {
	host: ESURL.hostname,
	port: ESURL.port,
  protocol: ESURL.protocol.substring(0, ESURL.protocol.length -1),
  auth: ESURL.auth,
  index: 'medias',
	hydrate: true,
	hydrateOptions:{
		select: 'mediaNumber size filename completedDate'
	}
});



mongoose.model('Media', MediaSchema);
mongoose.model('Folder', FolderSchema);
module.exports.Media = mongoose.model('Media');
module.exports.Folder = mongoose.model('Folder');
/**
 * Sync ES Indexes
 */
function syncIndex () {
  var sync_es = mongoose.model('Media').synchronize(), count = 0;

  sync_es.on('data', function(err){
    if (err) {
      console.log(err);
    }
    count++;
  });
  sync_es.on('close', function(){
    console.log('indexed ' + count + ' documents!');
  });
  sync_es.on('error', function(err){
    if (err) {
      console.log(err);
    }
    console.log(err);
  });
}

module.exports.syncIndex = syncIndex;