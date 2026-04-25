import mongoose from 'mongoose';
import Session from './models/Session.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
console.log(process.env.MONGODB_URI);

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const session = await Session.findOne({ sessionId: '8bd74f2d-7a98-4af8-be53-a32ec56ac299' });
  console.log("Full Session Dump:", JSON.stringify(session, null, 2));
  process.exit(0);
}
check();
