const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Referência ao modelo User
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
