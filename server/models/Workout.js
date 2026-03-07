const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format YYYY-MM-DD
  type: { type: String, required: true },
  duration: { type: Number, required: true },
  calories: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Workout', workoutSchema);
