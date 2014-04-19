/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    env = process.env.NODE_ENV || 'development',
    config = require('../../config/config')[env],
    Schema = mongoose.Schema;

/**
 * RequestToken Schema
 */
var RequestTokenSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    code: String,
    redirectUri: String,
    user: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    client: {
        type: Schema.ObjectId,
        ref: 'OAuthClient'
    },
});

/**
 * Statics
 */
RequestTokenSchema.statics = {
    load: function(id, cb) {
        this.findOne({
            _id: id
        }).exec(cb);
    }
};

mongoose.model('RequestToken', RequestTokenSchema);
