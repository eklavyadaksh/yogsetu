import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccuracyGauge } from '../components/AccuracyGauge';
import {
  normalizeUserStorageKey,
  getUserScheduleStorageKey,
  getUserSchedule,
  saveUserSchedule,
  clearUserSchedule
} from '../lib/userStorage';
import type { UserScheduleProfile } from '../components/ScheduleEnvironmentModal';

describe('AccuracyGauge Component', () => {
  it('renders accuracy percentage and holding status correctly', () => {
    render(<AccuracyGauge accuracy={85.4} isCorrect={true} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Holding')).toBeInTheDocument();
  });

  it('renders low accuracy with adjusting status', () => {
    render(<AccuracyGauge accuracy={45} isCorrect={false} />);
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Adjusting')).toBeInTheDocument();
  });
});

describe('User Storage Isolation', () => {
  it('normalizes storage keys for email and phone', () => {
    expect(normalizeUserStorageKey('Priya@Example.com')).toBe('priya@example.com');
    expect(normalizeUserStorageKey('+91 98765 43210')).toBe('_91_98765_43210');
    expect(normalizeUserStorageKey('')).toBe('guest');
    expect(normalizeUserStorageKey(null)).toBe('guest');
  });

  it('generates isolated schedule storage keys per user', () => {
    expect(getUserScheduleStorageKey('userA@test.com')).toBe('yogsetu_schedule_usera@test.com');
    expect(getUserScheduleStorageKey('userB@test.com')).toBe('yogsetu_schedule_userb@test.com');
  });

  it('saves, reads, and clears user schedules without cross-user contamination', () => {
    const userA = 'patient.one@example.com';
    const userB = 'patient.two@example.com';

    const profileA: UserScheduleProfile = {
      name: 'Patient One',
      email: userA,
      phone: '9876543210',
      age: 32,
      designation: 'Desk Worker',
      freeSlots: ['morning'],
      alarmTime: '07:00 AM',
      alarmEnabled: true,
      minutesAvailable: 15,
      injuries: [],
      customInjuryNotes: ''
    };

    const profileB: UserScheduleProfile = {
      name: 'Patient Two',
      email: userB,
      phone: '9876543211',
      age: 45,
      designation: 'Manager',
      freeSlots: ['evening'],
      alarmTime: '08:30 PM',
      alarmEnabled: false,
      minutesAvailable: 20,
      injuries: ['lumbar'],
      customInjuryNotes: 'lower back strain'
    };

    saveUserSchedule(profileA, userA);
    saveUserSchedule(profileB, userB);

    const schedA = getUserSchedule(userA);
    const schedB = getUserSchedule(userB);

    expect(schedA?.alarmTime).toBe('07:00 AM');
    expect(schedB?.alarmTime).toBe('08:30 PM');
    expect(schedA?.name).toBe('Patient One');
    expect(schedB?.name).toBe('Patient Two');

    clearUserSchedule(userA);
    expect(getUserSchedule(userA)).toBeNull();
    expect(getUserSchedule(userB)?.alarmTime).toBe('08:30 PM');
  });
});
