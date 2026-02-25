import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://gihozomichelangelo_db_user:Alwayscool@schoolapp.yrcvvrc.mongodb.net/?retryWrites=true&w=majority&appName=schoolapp';

async function testConnection() {
  try {
    await mongoose.connect(uri);
    console.log('✅ Successfully connected to MongoDB!');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testConnection();
