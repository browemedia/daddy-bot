const mongoose = require('mongoose');

const betStausSchema = new mongoose.Schema({
    name: {
        type: String
    },
    status: {
        type: Boolean,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date()
    } 
})

module.exports = mongoose.model('daddyBetStatus', betStausSchema)