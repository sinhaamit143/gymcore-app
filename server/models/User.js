const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: 'https://i.pravatar.cc/150' },
  points: { type: Number, default: 0 },
  currentWeight: { type: Number },
  targetWeight: { type: Number },
  age: { type: Number },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  role: { type: String, default: 'user' },
  purchasedServices: [{ type: Number }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
