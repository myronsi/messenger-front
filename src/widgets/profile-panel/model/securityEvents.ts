const warningEvents = new Set(['recovery_request_denied', 'passkey_counter_warning', 'refresh_reuse_detected', 'qr_login_denied']);

export const isWarningEvent = (type: string) => warningEvents.has(type) || /denied|failed|warning/.test(type);
