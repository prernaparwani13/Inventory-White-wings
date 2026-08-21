import mongoose from 'mongoose';

const auditItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  expectedQty: {
    type: Number,
    required: true,
    min: 0,
  },
  actualQty: {
    type: Number,
    required: true,
    min: 0,
  },
  discrepancy: {
    type: Number,
    required: true,
    default: 0,
  },
  remarks: {
    type: String,
    trim: true,
  },
});

const auditSchema = new mongoose.Schema({
  auditNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  items: [auditItemSchema],
  status: {
    type: String,
    enum: ['Draft', 'Reconciled', 'Cancelled'],
    default: 'Draft',
  },
  auditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reconciledAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

const Audit = mongoose.model('Audit', auditSchema);
export default Audit;
