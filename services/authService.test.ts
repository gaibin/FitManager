import { describe, expect, it } from 'vitest';
import { usernameToInternalEmail, validateCredentials } from './authService';

describe('trial account credentials', () => {
  it('keeps the UI username-only while producing a stable internal email', async () => {
    const first = await usernameToInternalEmail(' Coach_A ');
    const second = await usernameToInternalEmail('coach_a');
    expect(first).toBe(second);
    expect(first).toMatch(/^u-[a-f0-9]{48}@accounts\.ygfit\.local$/);
    expect(first).not.toContain('coach_a');
  });

  it('accepts Chinese usernames and rejects unsafe trial credentials', () => {
    expect(validateCredentials('张教练', '23332333')).toBeNull();
    expect(validateCredentials('ab', '23332333')).toBe('账号需为 3–24 个字符');
    expect(validateCredentials('coach one', '23332333')).toBe('账号不能包含空格');
    expect(validateCredentials('coach', '1234567')).toBe('密码至少需要 8 位');
  });
});
