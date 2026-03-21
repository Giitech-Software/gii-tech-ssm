// giitech-ssm-mobile/app/utils/idToEmail.ts
export const idToEmail = (id: string, role?: "student" | "teacher" | "parent" | string) => {
  if (!id) return "";
  const normalized = id.toString().trim().toLowerCase().replace(/\s+/g, "");
  const domain = "giitech-ssm.app";
  const local = role ? `${role}-${normalized}` : normalized;
  return `${local}@${domain}`;
};
