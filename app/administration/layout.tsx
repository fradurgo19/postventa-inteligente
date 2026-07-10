import { AppShell } from '@/components/layout/app-shell';

export default function AdministrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Administración' },
      ]}
    >
      {children}
    </AppShell>
  );
}
