import { describe, it, expect } from 'vitest';
import { calculateAngle, calculateVerticalAngle, getMidpoint } from '../lib/angles';
import { normalizeIdentifier, validateIdentifier } from '../lib/identity';

describe('Trigonometry and Angle Calculations', () => {
  it('correctly calculates 90-degree right angle', () => {
    // Points forming right angle at origin B(0, 0): A(0, 1) on y-axis, C(1, 0) on x-axis
    const a = { x: 0, y: 1 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBe(90);
  });

  it('correctly calculates 180-degree straight line angle', () => {
    // Points in straight line: A(-1, 0), B(0, 0), C(1, 0)
    const a = { x: -1, y: 0 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBe(180);
  });

  it('correctly calculates 45-degree acute angle', () => {
    const a = { x: 1, y: 1 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBe(45);
  });

  it('calculates vertical inclination angle correctly', () => {
    // Perfectly vertical line: top (0.5, 0.2), bottom (0.5, 0.8)
    const verticalTop = { x: 0.5, y: 0.2 };
    const verticalBottom = { x: 0.5, y: 0.8 };
    expect(calculateVerticalAngle(verticalTop, verticalBottom)).toBe(0);

    // 45-degree inclination: dx = 0.5, dy = 0.5
    const angledTop = { x: 0.7, y: 0.2 };
    const angledBottom = { x: 0.2, y: 0.7 };
    expect(calculateVerticalAngle(angledTop, angledBottom)).toBe(45);
  });

  it('computes landmark midpoint correctly', () => {
    const p1 = { x: 10, y: 20, z: 0.5, visibility: 0.9 };
    const p2 = { x: 20, y: 40, z: 1.5, visibility: 0.7 };

    const mid = getMidpoint(p1, p2);
    expect(mid.x).toBe(15);
    expect(mid.y).toBe(30);
    expect(mid.z).toBe(1);
    expect(mid.visibility).toBe(0.7);
  });
});

describe('Identity Normalization and Validation', () => {
  it('normalizes email addresses to lowercase and trimmed', () => {
    const res = normalizeIdentifier('  Priya.Sharma@Gmail.COM  ');
    expect(res.canonical).toBe('priya.sharma@gmail.com');
    expect(res.type).toBe('email');
  });

  it('normalizes Indian phone numbers with +91 or 91 country code', () => {
    const res1 = normalizeIdentifier('+91 98765 43210');
    expect(res1.canonical).toBe('9876543210');
    expect(res1.type).toBe('phone');

    const res2 = normalizeIdentifier('09876543210');
    expect(res2.canonical).toBe('9876543210');
    expect(res2.type).toBe('phone');
  });

  it('validates email and phone formats correctly', () => {
    expect(validateIdentifier('user@example.com')).toBe(true);
    expect(validateIdentifier('invalid-email')).toBe(false);
    expect(validateIdentifier('9876543210')).toBe(true);
    expect(validateIdentifier('123')).toBe(false); // too short
  });
});
