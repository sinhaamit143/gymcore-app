const mongoose = require('mongoose');

const assignedPlanSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['workout', 'meal'], required: true },
  title: { type: String, required: true },
  details: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('AssignedPlan', assignedPlanSchema);
