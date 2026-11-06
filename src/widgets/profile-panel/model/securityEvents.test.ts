import { describe, expect, it } from 'vitest';
import { isWarningEvent } from './securityEvents';

describe('isWarningEvent', () => {
  it('flags denied, failed and reused-token events', () => {
    expect(isWarningEvent('recovery_request_denied')).toBe(true);
    expect(isWarningEvent('passkey_counter_warning')).toBe(true);
    expect(isWarningEvent('refresh_reuse_detected')).toBe(true);
    expect(isWarningEvent('login_failed')).toBe(true);
    expect(isWarningEvent('qr_login_denied')).toBe(true);
  });

  it('keeps routine events neutral', () => {
    expect(isWarningEvent('login')).toBe(false);
    expect(isWarningEvent('qr_login')).toBe(false);
    expect(isWarningEvent('qr_login_approved')).toBe(false);
    expect(isWarningEvent('passkey_added')).toBe(false);
    expect(isWarningEvent('password_changed')).toBe(false);
  });
});
