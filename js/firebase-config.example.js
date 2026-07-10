/**
 * Optional: copy this file to firebase-config.js and fill in your free Firebase project.
 * Or paste the same values under Profile → Couple Group → Firebase setup.
 *
 * Setup (about 3 minutes):
 * 1. https://console.firebase.google.com → Create project
 * 2. Build → Realtime Database → Create (start in test mode, or use rules below)
 * 3. Project settings → Your apps → Web app → copy config
 * 4. Paste here or in the Profile form
 *
 * Suggested rules (code is the secret — share only with your partner):
 * {
 *   "rules": {
 *     "groups": {
 *       "$code": {
 *         ".read": true,
 *         ".write": true
 *       }
 *     }
 *   }
 * }
 */
window.CL_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT"
};
