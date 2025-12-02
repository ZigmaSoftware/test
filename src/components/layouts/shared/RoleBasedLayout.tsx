import { AdminLayout } from "@/components/layouts/admin/AdminLayout";
import { DashboardLayout } from "@/components/layouts/dashboard/DashboardLayout";
import type { RoleBasedLayoutProps, UserRole } from "@/types/roles";
import {
  ADMIN_ROLE,
  DEFAULT_ROLE,
  USER_ROLE_STORAGE_KEY,
} from "@/types/roles";

const getStoredRole = (): UserRole | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return (localStorage.getItem(USER_ROLE_STORAGE_KEY) as UserRole | null) ?? null;
};

export function RoleBasedLayout({
  children,
  roleOverride,
}: RoleBasedLayoutProps) {
  const resolvedRole = roleOverride ?? getStoredRole() ?? DEFAULT_ROLE;

  if (resolvedRole === ADMIN_ROLE) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
