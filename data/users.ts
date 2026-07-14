export type UserRole = "admin" | "customer";

export type SeedUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

// Phase 1 baseline: plaintext passwords in seed data are intentional and
// acceptable for this assessment app. Auth itself stays clean; security bugs
// are introduced behind the toggle infrastructure in Phase 4.
//
// Fixed admin login for reviewers: admin@medibyte.test / admin.incu123
export const users: readonly SeedUser[] = [
  {
    id: "user-admin",
    name: "MediByte Admin",
    email: "admin@medibyte.test",
    password: "admin.incu123",
    role: "admin",
  },
  {
    id: "user-customer-dana",
    name: "Dana Customer",
    email: "dana@example.test",
    password: "dana1234",
    role: "customer",
  },
  {
    id: "user-customer-omar",
    name: "Omar Customer",
    email: "omar@example.test",
    password: "omar1234",
    role: "customer",
  },
];
