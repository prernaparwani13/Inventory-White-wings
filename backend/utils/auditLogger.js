import AuditLog from '../models/AuditLog.js';

export const logActivity = async ({ userId, userName, action, details, ip }) => {
  try {
    const log = new AuditLog({
      user: userId,
      userName,
      action,
      details,
      ipAddress: ip || 'unknown',
    });
    await log.save();
  } catch (error) {
    console.error(`Audit logging failed: ${error.message}`);
  }
};
