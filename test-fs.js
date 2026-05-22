import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import config from './firebase-applet-config.json' with { type: "json" };

try {
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  await setDoc(doc(db, 'brands', 'test1'), { name: "test", category: "t", tier: "t", status: "t", createdAt: new Date().toISOString() });
  console.log("Written successfully");
} catch(e) {
  console.error("Failed:", e);
}
