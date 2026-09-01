export enum Role {
  SuperUser = 'Super User',
  Traveler = 'Traveler',
  Partner = 'Travel Partner',
  Guide = 'Tour Guide',
  Vendor = 'Vendor',
  Support = 'Support Executive',
}

export const ALL_ROLES = [
  Role.SuperUser,
  Role.Traveler,
  Role.Partner,
  Role.Guide,
  Role.Vendor,
  Role.Support,
];

export function normalizeRole(value: unknown): Role | null {
  const text = String(value || '').trim().toLowerCase();
  const map: Record<string, Role> = {
    superuser: Role.SuperUser,
    'super user': Role.SuperUser,
    'super admin': Role.SuperUser,
    traveler: Role.Traveler,
    partner: Role.Partner,
    'travel partner': Role.Partner,
    guide: Role.Guide,
    'tour guide': Role.Guide,
    vendor: Role.Vendor,
    support: Role.Support,
    'support executive': Role.Support,
  };
  return map[text] || null;
}
