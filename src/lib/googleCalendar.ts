import { Meeting } from '../types';

/**
 * Service to interact directly with Google Calendar API on behalf of the user
 */

interface GoogleCalendarEventInput {
  title: string;
  dateTime: string;
  location?: string;
  notes?: string;
  department?: string;
  solutionName?: string;
}

/**
 * Creates a calendar event on the user's primary Google Calendar.
 * Generates a Google Meet link automatically!
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  input: GoogleCalendarEventInput
): Promise<{ id: string; htmlLink: string; hangoutLink?: string } | null> {
  try {
    const startTimeStamp = new Date(input.dateTime).getTime();
    if (isNaN(startTimeStamp)) {
      throw new Error('전달된 일시 형식이 부적합합니다.');
    }
    
    // Default duration: 1 hour
    const endTime = new Date(startTimeStamp + 60 * 60 * 1000).toISOString();
    
    const body = {
      summary: `[B2B CRM] ${input.title}`,
      location: input.location || '',
      description: `[B2B Sales CRM 실시간 연동]\n\n` +
        `● 소속 부서: ${input.department || '영업 전략팀'}\n` +
        `● 제안 제품: ${input.solutionName || '미지정'}\n` +
        `● 주요 아젠다 및 메모:\n${input.notes || '작성된 사전 메모가 없습니다.'}\n\n` +
        `본 일정은 B2B Sales CRM에서 실시간 양방향 전송으로 자동 생성되었습니다.`,
      start: {
        dateTime: input.dateTime,
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: endTime,
        timeZone: 'Asia/Seoul'
      },
      conferenceData: {
        createRequest: {
          requestId: `crm-event-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Calendar create event error:', errText);
      throw new Error(`Google Calendar API Create Event Failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      htmlLink: data.htmlLink,
      hangoutLink: data.hangoutLink || undefined
    };
  } catch (error) {
    console.error('Failed inside createGoogleCalendarEvent:', error);
    return null;
  }
}

/**
 * Deletes a Google Calendar event
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Google Calendar delete event error:', errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed inside deleteGoogleCalendarEvent:', error);
    return false;
  }
}

/**
 * Lists the primary calendar events for the last 30 days
 */
export async function listGoogleCalendarEvents(
  accessToken: string,
  daysAgo: number = 30
): Promise<any[]> {
  try {
    const timeMin = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1050).toISOString();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Calendar list events error:', errText);
      throw new Error(`Google Calendar API List Events Failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed inside listGoogleCalendarEvents:', error);
    return [];
  }
}
