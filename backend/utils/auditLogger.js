import prisma from '../config/db.js';

export const logActivity = async ({ userId, userName, action, details, ip }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ? userId.toString() : null,
        userName,
        action,
        details,
        ipAddress: ip || 'unknown',
      },
    });
  } catch (error) {
    console.error(`Audit logging failed: ${error.message}`);
  }
};

