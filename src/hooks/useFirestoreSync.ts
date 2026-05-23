// ──────────────────────────────────────────────
// useFirestoreSync: Firestore 실시간 동기화 + API fallback 훅
// ──────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { withTimeout } from '../lib/utils';
import { FIRESTORE_TIMEOUT_MS } from '../constants';
import type {
  Brand,
  Contact,
  Meeting,
  Solution,
  BrandSolution,
  SyncStatus,
  ApprovedUser,
} from '../types';

export interface FirestoreSyncState {
  brands: Brand[];
  contacts: Contact[];
  meetings: Meeting[];
  solutions: Solution[];
  brandSolutions: BrandSolution[];
  syncStatus: SyncStatus;
  loading: boolean;
}

export interface FirestoreSyncActions {
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  setSolutions: React.Dispatch<React.SetStateAction<Solution[]>>;
  setBrandSolutions: React.Dispatch<React.SetStateAction<BrandSolution[]>>;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>;
  refreshAllStates: () => Promise<void>;
}

export function useFirestoreSync(
  isLoggedIn: boolean,
  setApprovedUsers: React.Dispatch<React.SetStateAction<ApprovedUser[]>>
): FirestoreSyncState & FirestoreSyncActions {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [brandSolutions, setBrandSolutions] = useState<BrandSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSynced: null,
    syncedEventsCount: 0,
    isSyncing: false,
  });

  // 전체 상태 새로고침
  const refreshAllStates = useCallback(async () => {
    try {
      setLoading(true);
      if (!isLoggedIn) return;

      // Firestore 직접 조회 시도 → 실패 시 API fallback
      try {
        const [resBrands, resContacts, resMeetings] = await withTimeout(
          Promise.all([
            getDocs(collection(db, 'brands')),
            getDocs(collection(db, 'contacts')),
            getDocs(collection(db, 'meetings')),
          ]),
          FIRESTORE_TIMEOUT_MS
        );

        setBrands(resBrands.docs.map((d) => ({ id: d.id, ...d.data() }) as Brand));
        setContacts(resContacts.docs.map((d) => ({ id: d.id, ...d.data() }) as Contact));
        setMeetings(resMeetings.docs.map((d) => ({ id: d.id, ...d.data() }) as Meeting));
      } catch (fbErr) {
        console.warn('⚠️ Firestore fetch failed, falling back to Express API:', fbErr);
        const [apiBrands, apiContacts, apiMeetings] = await Promise.all([
          fetch('/api/brands').then((res) => res.json()),
          fetch('/api/contacts').then((res) => res.json()),
          fetch('/api/meetings').then((res) => res.json()),
        ]);
        setBrands(apiBrands);
        setContacts(apiContacts);
        setMeetings(apiMeetings);
      }

      // 솔루션/매핑 데이터 조회
      try {
        const [apiSolutions, apiBrandSolutions] = await Promise.all([
          fetch('/api/solutions').then((res) => res.json()),
          fetch('/api/brand-solutions').then((res) => res.json()),
        ]);
        setSolutions(apiSolutions);
        setBrandSolutions(apiBrandSolutions);
      } catch (solErr) {
        console.warn('⚠️ Failed to fetch solutions or brandSolutions mappings:', solErr);
      }

      // 캘린더 동기화 상태 조회
      fetch('/api/calendar/sync-status')
        .then((r) => r.json())
        .then((resSync) => setSyncStatus(resSync))
        .catch(() => {});
    } catch (err) {
      console.error('Failed to refresh state data:', err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // 초기 로딩 및 Firestore onSnapshot 실시간 구독
  useEffect(() => {
    if (!isLoggedIn) return;

    refreshAllStates();

    // 실시간 구독
    const unsubMeetings = onSnapshot(
      collection(db, 'meetings'),
      (snapshot) => setMeetings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Meeting)),
      (error) => console.warn('⚠️ Real-time meetings sync unavailable:', error)
    );

    const unsubBrands = onSnapshot(
      collection(db, 'brands'),
      (snapshot) => setBrands(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Brand)),
      (error) => console.warn('⚠️ Real-time brands sync unavailable:', error)
    );

    const unsubContacts = onSnapshot(
      collection(db, 'contacts'),
      (snapshot) => setContacts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Contact)),
      (error) => console.warn('⚠️ Real-time contacts sync unavailable:', error)
    );

    const unsubUsers = onSnapshot(
      collection(db, 'approved_users'),
      (snapshot) => {
        const updatedUsers = snapshot.docs.map((d) => ({ email: d.id, ...d.data() })) as ApprovedUser[];
        setApprovedUsers(updatedUsers);
      },
      (error) => console.warn('⚠️ Real-time approved_users sync unavailable:', error)
    );

    return () => {
      unsubMeetings();
      unsubBrands();
      unsubContacts();
      unsubUsers();
    };
  }, [isLoggedIn, refreshAllStates, setApprovedUsers]);

  return {
    brands,
    contacts,
    meetings,
    solutions,
    brandSolutions,
    syncStatus,
    loading,
    setBrands,
    setContacts,
    setMeetings,
    setSolutions,
    setBrandSolutions,
    setSyncStatus,
    refreshAllStates,
  };
}
