import mongoose from "mongoose";

/**
 * Global cache interface for Mongoose in Next.js development environment.
 * Next.js hot-reloading can cause multiple connections to be opened if not cached.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

/**
 * Establishes a cached singleton connection to MongoDB Atlas.
 * Prevents multiple connections during Next.js Hot Module Replacement (HMR).
 * 
 * SERVER-SIDE ONLY: Never import this module in client components ("use client").
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "CRITICAL: MONGODB_URI environment variable is not defined. " +
      "Please set MONGODB_URI in your .env.local file or deployment environment."
    );
  }

  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Timeout fast if DB is unreachable
    };

    cached!.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

/**
 * Utility to close connection gracefully during testing or maintenance.
 */
export async function disconnectDatabase(): Promise<void> {
  if (cached?.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
