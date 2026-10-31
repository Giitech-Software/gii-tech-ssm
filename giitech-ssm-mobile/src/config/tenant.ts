const DEFAULT_TENANT_ID = "astem-ssm-001";
export let TENANT_ID = DEFAULT_TENANT_ID;
export function setTenantId(value: unknown) { TENANT_ID = String(value || "").trim() || DEFAULT_TENANT_ID; }
export function resetTenantId() { TENANT_ID = DEFAULT_TENANT_ID; }
export const DEFAULT_COUNTRY_CODE = "+233";
export const DEFAULT_SMS_SENDER = "+16092627371";
export const DEFAULT_WHATSAPP_SENDER = "whatsapp:+14155238886";
