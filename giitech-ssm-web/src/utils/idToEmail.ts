// giitech-ssm-web/src/utils/idToEmail.ts
/**
 * Convert a Student/Staff ID to a pseudo-email used for Firebase Auth.
 * Example: ST12345 -> st12345@giitech-ssm.app
 *
 * Keeps login for users simple (they enter ID), while Firebase Auth uses email/password.
 */
export const idToEmail = (id: string) => {
  if (!id) return "";
  const normalized = id.toString().trim().toLowerCase().replace(/\s+/g, "");
  const domain = "giitech-ssm.com"; // ✅ match here
  return `${normalized}@${domain}`;
};

