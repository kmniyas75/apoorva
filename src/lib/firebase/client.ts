import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
  logEvent,
  type Analytics
} from "firebase/analytics";

export const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyCLDCpJClinBjL0PcK0b9zgOXttx38J7bY",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "apoorva-89bc7.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "apoorva-89bc7",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "apoorva-89bc7.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "935613609704",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:935613609704:web:42584fd3bd32607e95fb5d",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-KTCMCKR6HQ"
};

// Initialize Firebase singleton safely across SSR and client
export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let analyticsInstance: Analytics | null = null;

/**
 * Initializes Firebase Analytics on the browser client when supported.
 */
export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (analyticsInstance) return analyticsInstance;

  try {
    const supported = await isAnalyticsSupported();
    if (supported) {
      analyticsInstance = getAnalytics(firebaseApp);
      return analyticsInstance;
    }
  } catch (err) {
    console.warn("[Firebase] Analytics initialization skipped:", err);
  }
  return null;
}

/**
 * Logs a custom or e-commerce event to Firebase Analytics (`G-KTCMCKR6HQ`).
 */
export async function trackApoorvaEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const analytics = await initFirebaseAnalytics();
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
    }
  } catch {
    // Non-blocking telemetry
  }
}
