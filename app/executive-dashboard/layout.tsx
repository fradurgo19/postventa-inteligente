import { AppShell } from '@/components/layout/app-shell';

export default function ExecutiveDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Panel Ejecutivo' },
      ]}
    >
      {children}
    </AppShell>
  );
}
