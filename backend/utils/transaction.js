const prisma = require('../db');

// Retry serialization conflicts only; callback must not perform external side effects.
async function serializable(work) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
}

module.exports = { serializable };
