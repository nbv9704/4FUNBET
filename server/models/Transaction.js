// server/models/Transaction.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const transactionSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['deposit','withdraw','transfer'], required: true },
  amount:      { type: Number, required: true },
  fromUserId:  { type: Schema.Types.ObjectId, ref: 'User' }, // chỉ dùng với transfer
  toUserId:    { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now }
})

module.exports = mongoose.model('Transaction', transactionSchema)
