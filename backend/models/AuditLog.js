import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userName: {
    type: String, // Keep name for backup
    trim: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
  },
  details: {
    type: String,
    required: true,
    trim: true,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Only log created time
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
