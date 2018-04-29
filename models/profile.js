var mongoose = require("mongoose");
// var passportLocalMongoose = require("passport-local-mongoose");

var ProfileSchema = new mongoose.Schema({
    firstName: { type : String , required : true },
    lastName: { type : String , required : true },
    picture: { data: Buffer, contentType: String },
    email: { type : String },
    DOB: { type : Date  },
    wallet: { type : String ,  unique : true, required : true },
    balance: { type : Number , required : true },
    privateKey: { type : String ,  unique : true, required : true },
    subAccounts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Profile"

    }],
    createdTasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"

    }],
    acceptedTasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"

    }],
     pendingTasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"

    }],
    status: { active: Boolean, tempHash: String }
});

// ProfileSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Profile", ProfileSchema);
