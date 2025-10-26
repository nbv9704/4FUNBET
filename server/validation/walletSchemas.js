// server/validation/walletSchemas.js

const Joi = require('joi');

// Deposit to Bank
const depositSchema = Joi.object({
  amount: Joi.number().min(1).max(1000000).required()
    .messages({
      'number.base': 'Số tiền phải là số',
      'number.min': 'Số tiền tối thiểu là 1',
      'number.max': 'Số tiền tối đa là 1,000,000',
      'any.required': 'Vui lòng nhập số tiền',
    }),
});

// Withdraw from Bank
const withdrawSchema = Joi.object({
  amount: Joi.number().min(1).max(1000000).required()
    .messages({
      'number.base': 'Số tiền phải là số',
      'number.min': 'Số tiền tối thiểu là 1',
      'number.max': 'Số tiền tối đa là 1,000,000',
      'any.required': 'Vui lòng nhập số tiền',
    }),
});

// Transfer to another user
const transferSchema = Joi.object({
  toUserId: Joi.string().required()
    .messages({
      'string.empty': 'Vui lòng nhập ID người nhận',
      'any.required': 'ID người nhận là bắt buộc',
    }),
  amount: Joi.number().min(1).max(1000000).required()
    .messages({
      'number.base': 'Số tiền phải là số',
      'number.min': 'Số tiền tối thiểu là 1',
      'number.max': 'Số tiền tối đa là 1,000,000',
      'any.required': 'Vui lòng nhập số tiền',
    }),
});

module.exports = {
  depositSchema,
  withdrawSchema,
  transferSchema,
};