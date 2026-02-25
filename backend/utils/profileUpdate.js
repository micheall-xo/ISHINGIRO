const User = require('../models/User');
const Student = require('../models/Student');

async function applyProfileUpdateForUser(user, body) {
  const {
    firstName,
    lastName,
    phoneNumber,
    profilePicture,
    username,
    email,
    studentInfo,
  } = body || {};

  if (username !== undefined) {
    const nextUsername = String(username || '').trim();
    if (!nextUsername) {
      throw new Error('Username cannot be empty');
    }
    const existing = await User.findOne({ username: nextUsername, _id: { $ne: user._id } });
    if (existing) {
      throw new Error('Username already in use');
    }
    user.username = nextUsername;
  }

  if (email !== undefined) {
    const nextEmail = String(email || '').trim().toLowerCase();
    if (!nextEmail) {
      throw new Error('Email cannot be empty');
    }
    const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
    if (existing) {
      throw new Error('Email already in use');
    }
    user.email = nextEmail;
  }

  if (firstName !== undefined) user.firstName = String(firstName || '').trim();
  if (lastName !== undefined) user.lastName = String(lastName || '').trim();
  if (phoneNumber !== undefined) user.phoneNumber = String(phoneNumber || '').trim();
  if (profilePicture !== undefined) user.profilePicture = String(profilePicture || '').trim();

  await user.save();

  if (user.role === 'student' && studentInfo && typeof studentInfo === 'object') {
    const student = await Student.findOne({ user: user._id });
    if (student) {
      if (studentInfo.grade !== undefined) {
        student.grade = String(studentInfo.grade || '').trim() || student.grade;
      }
      if (studentInfo.section !== undefined) {
        student.section = String(studentInfo.section || '').trim() || student.section;
      }
      if (studentInfo.gender !== undefined) {
        student.gender = studentInfo.gender || student.gender;
      }
      if (studentInfo.bloodGroup !== undefined) {
        student.bloodGroup = String(studentInfo.bloodGroup || '').trim();
      }
      if (studentInfo.academicYear !== undefined) {
        student.academicYear = String(studentInfo.academicYear || '').trim();
      }
      if (studentInfo.dateOfBirth !== undefined) {
        student.dateOfBirth = studentInfo.dateOfBirth ? new Date(studentInfo.dateOfBirth) : student.dateOfBirth;
      }
      if (studentInfo.address !== undefined) {
        if (studentInfo.address && typeof studentInfo.address === 'object') {
          student.address = {
            street: String(studentInfo.address.street || ''),
            city: String(studentInfo.address.city || ''),
            state: String(studentInfo.address.state || ''),
            zipCode: String(studentInfo.address.zipCode || ''),
            country: String(studentInfo.address.country || ''),
          };
        } else {
          student.address = {};
        }
      }
      if (studentInfo.emergencyContact !== undefined) {
        if (studentInfo.emergencyContact && typeof studentInfo.emergencyContact === 'object') {
          student.emergencyContact = {
            name: String(studentInfo.emergencyContact.name || ''),
            relationship: String(studentInfo.emergencyContact.relationship || ''),
            phone: String(studentInfo.emergencyContact.phone || ''),
            email: String(studentInfo.emergencyContact.email || ''),
          };
        } else {
          student.emergencyContact = {};
        }
      }
      await student.save();
    }
  }

  return {
    id: user._id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    fullName: user.getFullName(),
    phoneNumber: user.phoneNumber,
    profilePicture: user.profilePicture,
  };
}

module.exports = { applyProfileUpdateForUser };
