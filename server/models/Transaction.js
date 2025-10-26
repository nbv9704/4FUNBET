// server/models/Transaction.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:        { type: String, enum: ['deposit','withdraw','transfer'], required: true },
  amount:      { type: Number, required: true },
  fromUserId:  { type: Schema.Types.ObjectId, ref: 'User' },
  toUserId:    { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now }
});

// ✅ Compound index for efficient transaction history queries
transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);