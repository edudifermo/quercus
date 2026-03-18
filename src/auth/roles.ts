export const SYSTEM_ROLES = ["OWNER", "ADMIN", "ANALYST", "VIEWER"] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
