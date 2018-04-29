var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var crypto = require('crypto');
/*global options BadRequestError */

var UserSchema = new mongoose.Schema({
    username: { type : String , unique : true, required : true, dropDups: true },
    password: { type : String},
    failedLogIns: {attempts: Number, isLocked: Boolean, tempPassword: String, tempPasswordExpires: Number},
    recovery: {recoveryToken: String, tokenExpire: Number}
});

UserSchema.methods.setPassword = function (password, cb) {
    if (!password) {
        return cb(new BadRequestError(options.missingPasswordError));
    }

    var self = this;

    crypto.randomBytes(options.saltlen, function(err, buf) {
        if (err) {
            return cb(err);
        }

        var salt = buf.toString('hex');

        crypto.pbkdf2(password, salt, options.iterations, options.keylen, function(err, hashRaw) {
            if (err) {
                return cb(err);
            }

            self.set(options.hashField, new Buffer(hashRaw, 'binary').toString('hex'));
            self.set(options.saltField, salt);

            cb(null, self);
        });
    });
};

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);