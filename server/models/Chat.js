const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: { type: String },
  members: [{ type: String, required: true }], // user IDs or names
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
