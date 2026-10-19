import { bimrFor } from './bimr';

/**
 * Demo session until real sign-in exists (S-01 login flow is designed later).
 * Clicking "Sign in" drops the user straight into this course/team.
 *
 * The demo replays the Spring 2026 course from its real BIMR reports. `demoNow` pins the
 * app clock to the Period 6 decision week so the real deadline (Tue 7 Apr, 11:59 AM) is
 * still open. Set `demoNow` to null to use the real clock.
 */

export type Role = 'student' | 'instructor';

export interface CourseSession {
  courseName: string;
  term: string;
  teamNumber: number;
  teamName: string;
  studentName: string;
  currentPeriod: number;
  /** Last period whose results the instructor has released. The open period never has results. */
  resultsReleasedThrough: number;
  totalPeriods: number | null; // null = not announced
  deadline: string; // ISO with offset (Arizona time)
  demoNow: string | null;
}

const CURRENT_PERIOD = 6;

export const DEMO_SESSION: CourseSession = {
  courseName: 'Multinational Corporate Finance',
  term: 'Spring 2026',
  teamNumber: 3,
  teamName: 'Team 3',
  studentName: 'Demo Student',
  currentPeriod: CURRENT_PERIOD,
  resultsReleasedThrough: CURRENT_PERIOD - 1,
  totalPeriods: null,
  deadline: bimrFor(CURRENT_PERIOD)!.deadline,
  demoNow: '2026-04-03T10:00:00-07:00',
};

/** App clock: the pinned demo time, advancing in real time from page load. */
const loadedAt = Date.now();
export function appNow(): Date {
  if (!DEMO_SESSION.demoNow) return new Date();
  return new Date(new Date(DEMO_SESSION.demoNow).getTime() + (Date.now() - loadedAt));
}
