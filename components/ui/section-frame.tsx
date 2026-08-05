import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Acentos de sección alineados al Panel Principal:
 * Calculadora #cf1b22 · Proyectado #2563eb · CPP/catálogo #16a34a · Ejecutivo #d97706 · Admin #475569
 */
export const SECTION_ACCENTS = {
  filters: {
    key: 'filters',
    label: 'Filtros',
    color: '#cf1b22',
    border: 'border-[#cf1b22]/40',
    bar: 'bg-[#cf1b22]',
    softBg: 'bg-[#cf1b22]/5',
    chip: 'bg-[#fef2f2] text-[#b91c1c] border-[#cf1b22]/25',
  },
  equipment: {
    key: 'equipment',
    label: 'Equipo',
    color: '#2563eb',
    border: 'border-[#2563eb]/40',
    bar: 'bg-[#2563eb]',
    softBg: 'bg-[#2563eb]/5',
    chip: 'bg-[#eff6ff] text-[#1d4ed8] border-[#2563eb]/25',
  },
  catalog: {
    key: 'catalog',
    label: 'Detalle del servicio',
    color: '#16a34a',
    border: 'border-[#16a34a]/40',
    bar: 'bg-[#16a34a]',
    softBg: 'bg-[#16a34a]/5',
    chip: 'bg-[#f0fdf4] text-[#15803d] border-[#16a34a]/25',
  },
  costs: {
    key: 'costs',
    label: 'Costos',
    color: '#d97706',
    border: 'border-[#d97706]/40',
    bar: 'bg-[#d97706]',
    softBg: 'bg-[#d97706]/5',
    chip: 'bg-[#fffbeb] text-[#b45309] border-[#d97706]/25',
  },
  muted: {
    key: 'muted',
    label: 'Información',
    color: '#475569',
    border: 'border-[#475569]/35',
    bar: 'bg-[#475569]',
    softBg: 'bg-[#475569]/5',
    chip: 'bg-[#f8fafc] text-[#334155] border-[#475569]/25',
  },
} as const;

export type SectionAccentKey = keyof typeof SECTION_ACCENTS;

type CommonProps = {
  readonly variant: SectionAccentKey;
  readonly children: ReactNode;
  readonly className?: string;
  readonly showChip?: boolean;
  readonly chipLabel?: string;
};

type SectionFrameDivProps = CommonProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'> & {
    readonly as?: 'div' | 'section' | 'aside';
  };

type SectionFrameFormProps = CommonProps &
  Omit<FormHTMLAttributes<HTMLFormElement>, 'children' | 'className'> & {
    readonly as: 'form';
  };

export type SectionFrameProps = SectionFrameDivProps | SectionFrameFormProps;

function SectionChrome({
  variant,
  children,
  className,
  showChip = true,
  chipLabel,
}: CommonProps) {
  const accent = SECTION_ACCENTS[variant];
  return (
    <>
      <span
        className={cn('absolute left-0 top-0 bottom-0 w-1.5', accent.bar)}
        aria-hidden="true"
      />
      {showChip ? (
        <div className="absolute right-3 top-3 z-10 pointer-events-none">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              accent.chip
            )}
          >
            {chipLabel ?? accent.label}
          </span>
        </div>
      ) : null}
      <div className={cn('relative pl-1.5', className)}>{children}</div>
    </>
  );
}

export function SectionFrame(props: SectionFrameProps) {
  const {
    variant,
    children,
    className,
    showChip = true,
    chipLabel,
    as = 'div',
    ...rest
  } = props;
  const accent = SECTION_ACCENTS[variant];
  const shell = cn(
    'relative overflow-hidden rounded-xl border bg-card shadow-sm',
    accent.border,
    accent.softBg,
    className
  );

  if (as === 'form') {
    const formRest = rest as Omit<FormHTMLAttributes<HTMLFormElement>, 'children' | 'className'>;
    return (
      <form className={shell} {...formRest}>
        <SectionChrome
          variant={variant}
          showChip={showChip}
          chipLabel={chipLabel}
        >
          {children}
        </SectionChrome>
      </form>
    );
  }

  const Tag = as;
  const divRest = rest as Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'>;
  return (
    <Tag className={shell} {...divRest}>
      <SectionChrome variant={variant} showChip={showChip} chipLabel={chipLabel}>
        {children}
      </SectionChrome>
    </Tag>
  );
}
