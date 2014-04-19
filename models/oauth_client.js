/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    env = process.env.NODE_ENV || 'development',
    config = require('../../config/config')[env],
    utils = require('../../lib/utility'),
    Schema = mongoose.Schema;

/**
 * OAuthClient Schema
 */
var OAuthClientSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    user: {type:String, unique: true,required: true},
    clientKey: String,
    clientSecret: String
});

/**
 * Statics
 */
OAuthClientSchema.statics = {
    load: function(id, cb) {
        this.findOne({
            user: id
        }).exec(cb);
    }
};

/**
 * Pre-save hook
 */
OAuthClientSchema.pre('save', function(next) {
    if (!this.isNew) return next();
    this.clientKey = utils.uid(16);
    this.clientSecret = utils.uid(32);
    next();
});

mongoose.model('OAuthClient', OAuthClientSchema);
