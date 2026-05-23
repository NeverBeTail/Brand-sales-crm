// ──────────────────────────────────────────────
// useCalendarSync: Google Calendar 양방향 동기화 훅
// ──────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { loginWithGoogle, db } from '../lib/firebase';
import { createGoogleCalendarEvent, listGoogleCalendarEvents } from '../lib/googleCalendar';
import { SOLUTION_NAMES } from '../constants';
import type { Brand, Meeting, SyncStatus, UserRole } from '../types';

export interface CalendarSyncState {
  isSyncingCalendar: boolean;
}

export interface CalendarSyncActions {
  handleCalendarSync: () => Promise<void>;
  runTwoWayCalendarSync: (accessToken: string) => Promise<void>;
}

interface CalendarSyncDeps {
  brands: Brand[];
  meetings: Meeting[];
  userRole: UserRole;
  googleAccessToken: string | null;
  setGoogleAccessToken: (token: string | null) => void;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>;
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  refreshAllStates: () => Promise<void>;
}

export function useCalendarSync(deps: CalendarSyncDeps): CalendarSyncState & CalendarSyncActions {
  const {
    brands,
    meetings,
    userRole,
    googleAccessToken,
    setGoogleAccessToken,
    setSyncStatus,
    setMeetings,
    refreshAllStates,
  } = deps;

  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  const runTwoWayCalendarSync = useCallback(
    async (accessToken: string) => {
      setIsSyncingCalendar(true);
      let importedCount = 0;
      let exportedCount = 0;

      try {
        // 1. Google Calendar 이벤트 가져오기
        const googleEvents = await listGoogleCalendarEvents(accessToken, 30);
        const updatedLocalMeetings = [...meetings];

        // A: Google → CRM 임포트
        for (const evt of googleEvents) {
          const isAlreadySynced = meetings.some((m) => m.googleEventId === evt.id);
          if (isAlreadySynced) continue;

          const matchedBrand = brands.find(
            (b) =>
              (evt.summary && evt.summary.toLowerCase().includes(b.name.toLowerCase())) ||
              (evt.description && evt.description.toLowerCase().includes(b.name.toLowerCase()))
          );

          if (matchedBrand) {
            const newMeetId = `gcal-${evt.id}`;
            const newMeet: Meeting = {
              id: newMeetId,
              brandId: matchedBrand.id,
              title: evt.summary || '구글 캘린더 연동 회의',
              dateTime: evt.start?.dateTime || evt.start?.date || new Date().toISOString(),
              type: evt.location ? 'Offline' : 'Online',
              location: evt.location || '회의실 / 온라인',
              googleMeetLink: evt.hangoutLink || '',
              pipelineStatus: matchedBrand.pipelineStatus,
              notes: evt.description || 'Google Calendar에서 가져옴',
              summary: 'Google Calendar로부터 자동 수신 및 동기화된 미팅입니다.',
              actionItems: [],
              googleEventId: evt.id,
              googleCalendarHtmlLink: evt.htmlLink,
            };

            try {
              await setDoc(doc(db, 'meetings', newMeetId), newMeet);
            } catch (e) {
              console.warn('Direct Firestore insert bypassed:', e);
            }

            await fetch('/api/meetings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-User-Role': userRole },
              body: JSON.stringify(newMeet),
            });

            updatedLocalMeetings.unshift(newMeet);
            importedCount++;
          }
        }

        // B: CRM → Google Calendar 익스포트
        for (const m of meetings) {
          if (!m.googleEventId) {
            const brandObj = brands.find((b) => b.id === m.brandId);
            const brandName = brandObj?.name || '미지정';
            const solutionName = m.solutionId
              ? SOLUTION_NAMES[m.solutionId] || '기본 솔루션'
              : '미지정';

            const createdGEvent = await createGoogleCalendarEvent(accessToken, {
              title: `${brandName ? `[${brandName}] ` : ''}${m.title}`,
              dateTime: m.dateTime,
              location: m.location,
              notes: m.notes,
              department: m.department,
              solutionName: solutionName,
            });

            if (createdGEvent) {
              const updatedProps = {
                googleEventId: createdGEvent.id,
                googleCalendarHtmlLink: createdGEvent.htmlLink,
                googleMeetLink: createdGEvent.hangoutLink || m.googleMeetLink || '',
              };

              try {
                await updateDoc(doc(db, 'meetings', m.id), updatedProps);
              } catch (e) {
                console.warn('Direct Firestore update bypassed:', e);
              }

              await fetch(`/api/meetings/${m.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-User-Role': userRole },
                body: JSON.stringify(updatedProps),
              });

              exportedCount++;
            }
          }
        }

        await refreshAllStates();
        alert(
          `구글 캘린더 양방향 동기화 완수!\n- 가져온 일정: ${importedCount}건\n- 업로드한 일정: ${exportedCount}건`
        );
      } catch (error) {
        console.error('Failed inside runTwoWayCalendarSync:', error);
        alert('동기화 처리 과정 중 오류가 발생했습니다.');
      } finally {
        setIsSyncingCalendar(false);
      }
    },
    [brands, meetings, userRole, refreshAllStates]
  );

  const handleCalendarSync = useCallback(async () => {
    let currentToken = googleAccessToken;

    if (!currentToken) {
      const confirmConnect = confirm(
        '구글 캘린더와 실시간 양방향 연동을 수행하기 위해 Google 계정 토큰 갱신 및 접근 승인이 필요합니다. 연동을 시작할까요?'
      );
      if (!confirmConnect) {
        setIsSyncingCalendar(true);
        try {
          const res = await fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'X-User-Role': userRole },
          });
          const newStatus = await res.json();
          setSyncStatus(newStatus);
          alert('구글 계정 연동을 건너뛰고 로컬 데이터 시뮬레이셔널 동기화로 진행했습니다.');
        } catch (simErr) {
          console.error(simErr);
        } finally {
          setIsSyncingCalendar(false);
        }
        return;
      }

      try {
        const loginRes = await loginWithGoogle();
        if (loginRes?.accessToken) {
          setGoogleAccessToken(loginRes.accessToken);
          currentToken = loginRes.accessToken;
        } else {
          alert('승인 실패 또는 토큰을 획득하지 못했습니다.');
          return;
        }
      } catch (err) {
        console.error('Sign in failed:', err);
        alert('원터치 로그인 연동 과정에 실패했습니다.');
        return;
      }
    }

    if (currentToken) {
      await runTwoWayCalendarSync(currentToken);
    }
  }, [googleAccessToken, userRole, setSyncStatus, setGoogleAccessToken, runTwoWayCalendarSync]);

  return {
    isSyncingCalendar,
    handleCalendarSync,
    runTwoWayCalendarSync,
  };
}
