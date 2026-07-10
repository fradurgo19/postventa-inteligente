import { AppShell } from '@/components/layout/app-shell';

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Calculadora de Mantenimiento' },
      ]}
    >
      {children}
    </AppShell>
  );
}
