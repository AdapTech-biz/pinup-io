var mongoose = require("mongoose");

var TaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    date: Date,
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Profile"
    },
    acceptor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Profile"
    },
    payout: {
        amount: Number,
        status: Boolean
    },
    status: { active: Boolean, tempHash: String }
});


module.exports = mongoose.model("Task", TaskSchema);
