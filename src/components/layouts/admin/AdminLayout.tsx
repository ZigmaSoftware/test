import type { AdminLayoutProps } from "@/types/roles";

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-gray-50 px-4 py-8 dark:bg-gray-900">
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}
