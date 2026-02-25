const User = require('../models/User');

async function ensureDefaultAdmin() {
  const username = (process.env.DEFAULT_ADMIN_USERNAME || 'admin').trim();
  const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@schoolapp.local').trim().toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';
  const firstName = (process.env.DEFAULT_ADMIN_FIRST_NAME || 'System').trim();
  const lastName = (process.env.DEFAULT_ADMIN_LAST_NAME || 'Admin').trim();

  const existing = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      existing.isActive = true;
      await existing.save();
      console.log(`Promoted existing user "${existing.username}" to admin`);
    } else {
      console.log(`Admin user "${existing.username}" already exists`);
    }
    return existing;
  }

  const admin = new User({
    username,
    email,
    password,
    firstName,
    lastName,
    role: 'admin',
    isActive: true,
  });

  await admin.save();
  console.log(`Created default admin user "${username}"`);
  return admin;
}

module.exports = { ensureDefaultAdmin };
