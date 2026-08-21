import mongoose from 'mongoose';

const returnSchema = new mongoose.Schema({
  returnNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  orderNumber: {
    type: String, // String representation of Order Number
    required: true,
    trim: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending Approval', 'Approved & Restocked', 'Rejected', 'Scrapped'],
    default: 'Pending Approval',
  },
  actionTaken: {
    type: String,
    trim: true,
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

const Return = mongoose.model('Return', returnSchema);
export default Return;
