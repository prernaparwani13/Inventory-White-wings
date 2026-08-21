import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  type: {
    type: String,
    enum: ['In', 'Out', 'Adjustment', 'Return', 'Audit Reconciled'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  previousQty: {
    type: Number,
    required: true,
    min: 0,
  },
  newQty: {
    type: Number,
    required: true,
    min: 0,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  referenceId: {
    type: String, // Can store Order ID, Audit ID, or Return ID
    trim: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
