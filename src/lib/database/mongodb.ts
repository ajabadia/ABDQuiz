import mongoose from 'mongoose';
import { tenantStorage, getTenantConnection, ensureConnectionReady } from './tenant-model';

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 */
const cached: MongooseCache = (global as { mongoose?: MongooseCache }).mongoose || { conn: null, promise: null };

if (!(global as { mongoose?: MongooseCache }).mongoose) {
  (global as { mongoose?: MongooseCache }).mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (!cached.conn) {
    if (!cached.promise) {
      const opts = {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
        console.log('✅ MongoDB connected successfully to Cluster');
        return mongooseInstance;
      });
    }

    try {
      cached.conn = await cached.promise;
    } catch (e) {
      cached.promise = null;
      throw e;
    }
  }

  // Ensure active tenant connection is ready if we are in a tenant context
  const store = tenantStorage.getStore();
  if (store) {
    try {
      const tenantConn = getTenantConnection(store.dbPrefix, store.isolationStrategy);
      await ensureConnectionReady(tenantConn);
    } catch (e) {
      console.error(`[MultiTenant] Failed to connect to tenant database for ${store.dbPrefix}:`, e);
      throw e;
    }
  }

  return cached.conn;
}

export default connectDB;
