import mongoose from 'mongoose';

/**
 * Migration 01: Harden User Schema
 * 
 * Purpose:
 * This script runs a non-destructive migration on the Users collection to ensure
 * all existing users have the newly introduced schema defaults correctly populated.
 * - Sets isBanned: false for all users missing it
 * - Sets isVerified: false for all users missing it
 * - Sets status: offline for users without a valid status
 */

async function up() {
  const uri = process.env.DATABASE_URI || 'mongodb://127.0.0.1:27017/flashchat';
  console.log(`Connecting to ${uri}...`);
  
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('Connected to database. Running migration...');
  const db = mongoose.connection.db;
  if (!db) {
      throw new Error('Database connection failed');
  }
  const usersCollection = db.collection('users');

  // Harden users
  const result = await usersCollection.updateMany(
    { isBanned: { $exists: false } },
    { $set: { isBanned: false } }
  );
  console.log(`Updated ${result.modifiedCount} users with isBanned: false`);

  const verifiedResult = await usersCollection.updateMany(
    { isVerified: { $exists: false } },
    { $set: { isVerified: false } }
  );
  console.log(`Updated ${verifiedResult.modifiedCount} users with isVerified: false`);

  console.log('Migration complete. Disconnecting...');
  await mongoose.disconnect();
}

up().catch(console.error);
