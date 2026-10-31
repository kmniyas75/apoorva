import { MongoClient, Db } from "mongodb";
import type { StoreDatabase } from "@/lib/store/adminStore";
import type { ShipmentTrackingRecord } from "@/lib/types/checkout";

const DEFAULT_MONGO_USER = "diefutureapartments_db_user";
const DEFAULT_MONGO_PASS = Buffer.from(
  "R0hxWGFRQXJXQnZScG9lUA==",
  "base64"
).toString("utf8");
const DEFAULT_MONGO_HOST = "cluster0.zv7rcvi.mongodb.net";

export function getMongoUri(): string {
  return (
    process.env.MONGODB_URI ||
    `mongodb+srv://${DEFAULT_MONGO_USER}:${DEFAULT_MONGO_PASS}@${DEFAULT_MONGO_HOST}/?appName=Cluster0`
  );
}

export function getMongoDbName(): string {
  return process.env.MONGODB_DB_NAME || process.env.DB_NAME || "apoorva";
}

const globalMongo = globalThis as unknown as {
  __APOORVA_MONGO_CLIENT__?: MongoClient;
  __APOORVA_MONGO_PROMISE__?: Promise<MongoClient>;
};

export async function getMongoDatabase(): Promise<Db> {
  const uri = getMongoUri();
  if (!globalMongo.__APOORVA_MONGO_PROMISE__) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000
    });
    globalMongo.__APOORVA_MONGO_PROMISE__ = client.connect().then((c) => {
      globalMongo.__APOORVA_MONGO_CLIENT__ = c;
      return c;
    });
  }
  const connectedClient = await globalMongo.__APOORVA_MONGO_PROMISE__;
  return connectedClient.db(getMongoDbName());
}

/**
 * Loads the complete StoreDatabase from the `apoorva` database in MongoDB Atlas.
 */
export async function loadStoreFromMongoDB(): Promise<StoreDatabase | null> {
  try {
    const db = await getMongoDatabase();
    const stateDoc = await db
      .collection<{ _id: string; data: StoreDatabase }>("store_state")
      .findOne({ _id: "main" });

    if (stateDoc?.data && Array.isArray(stateDoc.data.products)) {
      return stateDoc.data;
    }
    return null;
  } catch (err) {
    console.warn("[MongoDB] Could not load store_state from apoorva DB:", err);
    return null;
  }
}

/**
 * Saves the StoreDatabase into the `apoorva` database in MongoDB Atlas,
 * updating both `store_state` and the individual collections:
 * `products`, `beach_moments`, `orders`, `media_library`, `social_events`.
 */
export async function saveStoreToMongoDB(
  store: StoreDatabase
): Promise<boolean> {
  try {
    const db = await getMongoDatabase();

    // 1. Upsert master snapshot in `store_state`
    await db
      .collection<{ _id: string; data: StoreDatabase; updatedAt: string }>(
        "store_state"
      )
      .updateOne(
        { _id: "main" },
        {
          $set: {
            data: store,
            updatedAt: store.updatedAt || new Date().toISOString()
          }
        },
        { upsert: true }
      );

    // 2. Sync normalized collections in `apoorva` DB for easy querying/inspection
    await Promise.all([
      (async () => {
        const col = db.collection("products");
        await col.deleteMany({});
        if (store.products.length > 0) {
          await col.insertMany(
            store.products.map((p) => ({ ...p, _id: p.id as unknown as never }))
          );
        }
      })(),
      (async () => {
        const col = db.collection("beach_moments");
        await col.deleteMany({});
        if (store.beachMoments.length > 0) {
          await col.insertMany(
            store.beachMoments.map((m) => ({
              ...m,
              _id: m.id as unknown as never
            }))
          );
        }
      })(),
      (async () => {
        const col = db.collection("orders");
        await col.deleteMany({});
        if (store.orders.length > 0) {
          await col.insertMany(
            store.orders.map((o) => ({
              ...o,
              _id: o.orderId as unknown as never
            }))
          );
        }
      })(),
      (async () => {
        const col = db.collection("media_library");
        await col.deleteMany({});
        if (Array.isArray(store.customMedia) && store.customMedia.length > 0) {
          await col.insertMany(
            store.customMedia.map((m) => ({
              ...m,
              _id: m.id as unknown as never
            }))
          );
        }
      })(),
      (async () => {
        const col = db.collection("social_events");
        await col.deleteMany({});
        if (
          Array.isArray(store.socialEvents) &&
          store.socialEvents.length > 0
        ) {
          await col.insertMany(
            store.socialEvents.map((e) => ({
              ...e,
              _id: e.id as unknown as never
            }))
          );
        }
      })()
    ]);

    return true;
  } catch (err) {
    console.warn("[MongoDB] Failed to save store to apoorva DB:", err);
    return false;
  }
}

/**
 * Saves a shipment tracking record in the `tracking_records` collection in `apoorva` DB.
 */
export async function saveTrackingToMongoDB(
  record: ShipmentTrackingRecord
): Promise<void> {
  try {
    const db = await getMongoDatabase();
    await db
      .collection("tracking_records")
      .updateOne(
        { orderId: record.orderId },
        { $set: { ...record, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
  } catch (err) {
    console.warn("[MongoDB] Could not save tracking record:", err);
  }
}

/**
 * Finds a shipment tracking record by `orderId` or `trackingNumber` from `apoorva` DB.
 */
export async function loadTrackingFromMongoDB(
  query: string
): Promise<ShipmentTrackingRecord | null> {
  try {
    const clean = query.trim().toUpperCase();
    const db = await getMongoDatabase();
    const doc = await db.collection<ShipmentTrackingRecord>("tracking_records").findOne({
      $or: [{ orderId: clean }, { trackingNumber: clean }]
    });
    return doc || null;
  } catch {
    return null;
  }
}
