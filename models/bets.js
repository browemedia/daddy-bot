const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },
    bet: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('daddyBet', betSchema)