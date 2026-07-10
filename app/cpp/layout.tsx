import { AppShell } from '@/components/layout/app-shell';

export default function CppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Repuestos Inteligentes CPP' },
      ]}
    >
      {children}
    </AppShell>
  );
}
