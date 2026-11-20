export interface NormalizedIdentity {
  canonical: string;
  type: 'email' | 'phone';
}

export function normalizeIdentifier(raw: string): NormalizedIdentity {
  const cleaned = raw.trim();
  if (cleaned.includes('@')) {
    return {
      canonical: cleaned.toLowerCase(),
      type: 'email',
    };
  }

  // Remove non-digit characters
  let digits = cleaned.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return {
    canonical: digits,
    type: 'phone',
  };
}

export function validateIdentifier(raw: string): boolean {
  const { canonical, type } = normalizeIdentifier(raw);
  if (type === 'email') {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(canonical);
  }
  return canonical.length >= 7;
}
