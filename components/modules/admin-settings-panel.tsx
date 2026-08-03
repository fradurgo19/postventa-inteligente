'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Globe, Percent, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSaveSystemConfig, useSystemConfig } from '@/hooks/use-administration';
import { useUserStore } from '@/store';
import type { SystemConfig } from '@/services/administration.service';
import { toast } from 'sonner';

export function AdminSettingsPanel() {
  const { data, isLoading } = useSystemConfig();
  const saveMutation = useSaveSystemConfig();
  const currentUser = useUserStore((s) => s.currentUser);
  const [form, setForm] = useState<SystemConfig | null>(null);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  if (isLoading || !form) {
    return <Skeleton className="h-96 w-full max-w-2xl rounded-xl" />;
  }

  const setField = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        config: form,
        updatedBy: currentUser?.email ?? currentUser?.name ?? 'admin',
      });
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar. Ejecute SQL 20.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-border shadow-sm p-6 max-w-2xl"
    >
      <h2 className="text-sm font-semibold text-foreground mb-6">Configuración del Sistema</h2>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" /> Información de la Empresa
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nombre de la Empresa</Label>
              <Input
                value={form.empresa_nombre}
                onChange={(e) => setField('empresa_nombre', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>NIT</Label>
              <Input value={form.nit} onChange={(e) => setField('nit', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setField('telefono', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Dirección</Label>
              <Input
                value={form.direccion}
                onChange={(e) => setField('direccion', e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Correo corporativo</Label>
              <Input
                value={form.email_corporativo}
                onChange={(e) => setField('email_corporativo', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" /> Localización
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.moneda} onValueChange={(v) => setField('moneda', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Idioma</Label>
              <Select value={form.idioma} onValueChange={(v) => setField('idioma', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Zona horaria</Label>
              <Input
                value={form.zona_horaria}
                onChange={(e) => setField('zona_horaria', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Percent className="h-3.5 w-3.5" /> Comercial
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>IVA (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.iva_porcentaje}
                onChange={(e) => setField('iva_porcentaje', Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Días de crédito</Label>
              <Input
                type="number"
                min={0}
                value={form.dias_credito}
                onChange={(e) => setField('dias_credito', Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <Button
          className="bg-[#cf1b22] hover:bg-[#a81419] text-white gap-1.5"
          disabled={saveMutation.isPending}
          onClick={() => void handleSave()}
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </motion.div>
  );
}
