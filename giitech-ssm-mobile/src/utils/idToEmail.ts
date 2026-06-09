// giitech-ssm-mobile/app/utils/idToEmail.ts
// Keep this in sync with the web client so both apps use the same account.
export const idToEmail = (id: string) => {
  if (!id) return "";
  const normalized = id.toString().trim().toLowerCase().replace(/\s+/g, "");
  return `${normalized}@giitech-ssm.com`;
};
