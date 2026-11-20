import { UserScheduleProfile } from '../components/ScheduleEnvironmentModal';
export type { UserScheduleProfile };

/**
 * Normalizes an identifier (email or phone) into a clean, safe localStorage key suffix.
 */
export function normalizeUserStorageKey(identifier?: string | null): string {
  if (!identifier || !identifier.trim()) {
    return 'guest';
  }
  return identifier
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@_.-]/g, '_');
}

/**
 * Gets the localStorage key for a specific user's scheduled routine.
 */
export function getUserScheduleStorageKey(identifier?: string | null): string {
  const key = normalizeUserStorageKey(identifier);
  return `yogsetu_schedule_${key}`;
}

/**
 * Fetches the isolated schedule profile for the currently logged-in user.
 * Guarantees that user A never sees user B's schedule.
 */
export function getUserSchedule(identifier?: string | null): UserScheduleProfile | null {
  try {
    const key = getUserScheduleStorageKey(identifier);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }

    // Migration / fallback: if a single legacy 'yogsetu_user_schedule' exists
    // and matches this user's email/phone, migrate it to the isolated key
    const legacyRaw = localStorage.getItem('yogsetu_user_schedule');
    if (legacyRaw) {
      const legacy: UserScheduleProfile = JSON.parse(legacyRaw);
      if (
        identifier &&
        (legacy.email?.toLowerCase() === identifier.toLowerCase() ||
          legacy.phone?.trim() === identifier.trim())
      ) {
        // Save into isolated key
        localStorage.setItem(key, legacyRaw);
        return legacy;
      } else if (!identifier && !legacy.email && !legacy.phone) {
        // Guest legacy
        return legacy;
      }
    }
  } catch (err) {
    console.warn('Failed to load user schedule from storage:', err);
  }
  return null;
}

/**
 * Saves a user schedule strictly isolated under their own account identifier.
 */
export function saveUserSchedule(
  profile: UserScheduleProfile,
  identifier?: string | null
): void {
  try {
    const userKey = identifier || profile.email || profile.phone || 'guest';
    const storageKey = getUserScheduleStorageKey(userKey);
    localStorage.setItem(storageKey, JSON.stringify(profile));

    // Also update alarm preferences for this user
    if (profile.alarmTime) {
      localStorage.setItem(`yogsetu_alarm_time_${normalizeUserStorageKey(userKey)}`, profile.alarmTime);
      localStorage.setItem('yogsetu_alarm_time', profile.alarmTime);
    }
    localStorage.setItem(
      `yogsetu_alarm_enabled_${normalizeUserStorageKey(userKey)}`,
      profile.alarmEnabled ? 'true' : 'false'
    );
    localStorage.setItem('yogsetu_alarm_enabled', profile.alarmEnabled ? 'true' : 'false');

    // Notify all active tabs and components
    window.dispatchEvent(new Event('yogsetu_schedule_updated'));
  } catch (err) {
    console.error('Failed to save user schedule to storage:', err);
  }
}

/**
 * Clears a specific user's schedule profile upon request.
 */
export function clearUserSchedule(identifier?: string | null): void {
  try {
    const storageKey = getUserScheduleStorageKey(identifier);
    localStorage.removeItem(storageKey);
    window.dispatchEvent(new Event('yogsetu_schedule_updated'));
  } catch (err) {
    console.error('Failed to clear user schedule:', err);
  }
}
