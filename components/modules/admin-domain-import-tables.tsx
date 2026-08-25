'use client';

import { useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useAdminAsesores,
  useAdminClientes,
  useAdminMaquinas,
  useAdminSedes,
  useCreateAsesor,
  useCreateCliente,
  useCreateMaquina,
  useUpdateAsesor,
  useUpdateCliente,
  useUpdateMaquina,
} from '@/hooks/use-administration';
import type {
  AdminAsesorRow,
  AdminClienteRow,
  AdminMaquinaRow,
  AdminSedeOption,
} from '@/services/administration.service';

interface AdminDomainImportTablesProps {
  readonly kind: 'Asesores' | 'Equipos' | 'Clientes';
  readonly canManage: boolean;
}

function EmptyRow({ colSpan, message }: Readonly<{ colSpan: number; message: string }>) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-muted-foreground">
        {message}
      </td>
    </tr>
  );
}

export function AdminDomainImportTables({ kind, canManage }: AdminDomainImportTablesProps) {
  if (kind === 'Asesores') {
    return <AsesoresTable canManage={canManage} />;
  }
  if (kind === 'Clientes') {
    return <ClientesTable canManage={canManage} />;
  }
  return <EquiposTable canManage={canManage} />;
}

function AsesoresTable({ canManage }: Readonly<{ canManage: boolean }>) {
  const { data: rows = [], isLoading, refetch } = useAdminAsesores();
  const createMutation = useCreateAsesor();
  const updateMutation = useUpdateAsesor();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAsesorRow | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [sede, setSede] = useState('');
  const [activo, setActivo] = useState(true);

  const openCreate = () => {
    setEditing(null);
    setNombre('');
    setEmail('');
    setSede('');
    setActivo(true);
    setOpen(true);
  };

  const openEdit = (row: AdminAsesorRow) => {
    setEditing(row);
    setNombre(row.nombre);
    setEmail(row.email);
    setSede(row.sede ?? '');
    setActivo(row.activo);
    setOpen(true);
  };

  const save = async () => {
    if (!nombre.trim() || !email.trim()) {
      toast.error('Nombre y email son obligatorios');
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          input: { nombre, email, sede: sede.trim() || null, activo },
        });
        toast.success('Asesor actualizado');
      } else {
        await createMutation.mutateAsync({
          nombre,
          email,
          sede: sede.trim() || null,
          activo,
        });
        toast.success('Asesor creado');
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-2xl">
          Maestros en <code className="text-[11px]">asesores</code>. Se cargan desde la columna{' '}
          <strong>Asesor2 / ASESOR 2</strong> del Excel o manualmente aquí.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Actualizar
          </Button>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              className="h-8 bg-[#cf1b22] hover:bg-[#a81419] text-white"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Agregar asesor
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground font-semibold border-b">
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Sede</th>
                <th className="px-3 py-2 text-center">Activo</th>
                <th className="px-3 py-2 text-right">Clientes</th>
                <th className="px-3 py-2 text-right">Equipos</th>
                <th className="px-3 py-2 text-right">Oportunidades</th>
                {canManage ? <th className="px-3 py-2 text-left">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={canManage ? 8 : 7} message="Sin asesores. Importe telemetría o agregue uno." />
              ) : (
                rows.map((a: AdminAsesorRow) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{a.nombre}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.email}</td>
                    <td className="px-3 py-2">{a.sede || '—'}</td>
                    <td className="px-3 py-2 text-center">{a.activo ? 'Sí' : 'No'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.clientes}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.equipos}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.oportunidades}</td>
                    {canManage ? (
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEdit(a)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar asesor' : 'Agregar asesor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sede</Label>
              <Input value={sede} onChange={(e) => setSede(e.target.value)} placeholder="Ej: Bogotá" />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label className="cursor-pointer">Activo</Label>
              <Switch checked={activo} onCheckedChange={setActivo} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#cf1b22] hover:bg-[#a81419] text-white"
              disabled={pending}
              onClick={() => void save()}
            >
              {pending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientesTable({ canManage }: Readonly<{ canManage: boolean }>) {
  const { data: rows = [], isLoading, refetch } = useAdminClientes();
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminClienteRow | null>(null);
  const [titulo, setTitulo] = useState('');
  const [nit, setNit] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');

  const openCreate = () => {
    setEditing(null);
    setTitulo('');
    setNit('');
    setEmail('');
    setTelefono('');
    setCiudad('');
    setOpen(true);
  };

  const openEdit = (row: AdminClienteRow) => {
    setEditing(row);
    setTitulo(row.titulo);
    setNit(row.nit ?? '');
    setEmail(row.email ?? '');
    setTelefono(row.telefono ?? '');
    setCiudad(row.ciudad ?? '');
    setOpen(true);
  };

  const save = async () => {
    if (!titulo.trim()) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }
    const input = {
      titulo,
      nit: nit.trim() || null,
      email: email.trim() || null,
      telefono: telefono.trim() || null,
      ciudad: ciudad.trim() || null,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input });
        toast.success('Cliente actualizado');
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Cliente creado');
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-2xl">
          Maestros en <code className="text-[11px]">clientes</code>. Poblados por telemetría o
          manualmente. Cada cliente se vincula a equipos en flota.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Actualizar
          </Button>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              className="h-8 bg-[#cf1b22] hover:bg-[#a81419] text-white"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Agregar cliente
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground font-semibold border-b">
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">NIT</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Teléfono</th>
                <th className="px-3 py-2 text-left">Ciudad</th>
                <th className="px-3 py-2 text-right">Equipos</th>
                {canManage ? <th className="px-3 py-2 text-left">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={canManage ? 7 : 6} message="Sin clientes. Importe telemetría o agregue uno." />
              ) : (
                rows.map((c: AdminClienteRow) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{c.titulo}</td>
                    <td className="px-3 py-2">{c.nit || '—'}</td>
                    <td className="px-3 py-2">{c.email || '—'}</td>
                    <td className="px-3 py-2">{c.telefono || '—'}</td>
                    <td className="px-3 py-2 max-w-[12rem] truncate" title={c.ciudad ?? ''}>
                      {c.ciudad || '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.equipos}</td>
                    {canManage ? (
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Agregar cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre / Razón social</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>NIT</Label>
              <Input value={nit} onChange={(e) => setNit(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#cf1b22] hover:bg-[#a81419] text-white"
              disabled={pending}
              onClick={() => void save()}
            >
              {pending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EquiposTable({ canManage }: Readonly<{ canManage: boolean }>) {
  const { data: rows = [], isLoading, refetch } = useAdminMaquinas();
  const { data: clientes = [] } = useAdminClientes();
  const { data: sedes = [] } = useAdminSedes();
  const createMutation = useCreateMaquina();
  const updateMutation = useUpdateMaquina();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMaquinaRow | null>(null);
  const [serie, setSerie] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [tipoMaquina, setTipoMaquina] = useState('');
  const [clienteId, setClienteId] = useState<string>('none');
  const [sedeId, setSedeId] = useState<string>('none');
  const [activo, setActivo] = useState(true);

  const openCreate = () => {
    setEditing(null);
    setSerie('');
    setMarca('');
    setModelo('');
    setTipoMaquina('');
    setClienteId('none');
    setSedeId('none');
    setActivo(true);
    setOpen(true);
  };

  const openEdit = (row: AdminMaquinaRow) => {
    setEditing(row);
    setSerie(row.serie);
    setMarca(row.marca);
    setModelo(row.modelo);
    setTipoMaquina(row.tipo_maquina ?? '');
    setClienteId(row.cliente_id ?? 'none');
    setSedeId(row.sede_id ?? 'none');
    setActivo(row.activo);
    setOpen(true);
  };

  const save = async () => {
    if (!serie.trim() || !marca.trim() || !modelo.trim()) {
      toast.error('Serie, marca y modelo son obligatorios');
      return;
    }
    const input = {
      serie,
      marca,
      modelo,
      tipo_maquina: tipoMaquina.trim() || null,
      cliente_id: clienteId === 'none' ? null : clienteId,
      sede_id: sedeId === 'none' ? null : sedeId,
      activo,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input });
        toast.success('Equipo actualizado');
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Equipo creado');
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-2xl">
          Flota en <code className="text-[11px]">maquinas</code> (serie única). Se cargan con
          telemetría o manualmente. Relación: máquina → cliente → sede.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Actualizar
          </Button>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              className="h-8 bg-[#cf1b22] hover:bg-[#a81419] text-white"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Agregar equipo
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground font-semibold border-b">
                <th className="px-3 py-2 text-left">Serie</th>
                <th className="px-3 py-2 text-left">Marca</th>
                <th className="px-3 py-2 text-left">Modelo</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Sede</th>
                <th className="px-3 py-2 text-center">Activo</th>
                {canManage ? <th className="px-3 py-2 text-left">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={canManage ? 8 : 7} message="Sin equipos. Importe telemetría o agregue uno." />
              ) : (
                rows.map((m: AdminMaquinaRow) => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono">{m.serie}</td>
                    <td className="px-3 py-2">{m.marca}</td>
                    <td className="px-3 py-2">{m.modelo}</td>
                    <td className="px-3 py-2">{m.tipo_maquina || '—'}</td>
                    <td className="px-3 py-2">{m.cliente || '—'}</td>
                    <td className="px-3 py-2">{m.sede || '—'}</td>
                    <td className="px-3 py-2 text-center">{m.activo ? 'Sí' : 'No'}</td>
                    {canManage ? (
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar equipo' : 'Agregar equipo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Serie</Label>
              <Input
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                disabled={Boolean(editing)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input value={marca} onChange={(e) => setMarca(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input value={modelo} onChange={(e) => setModelo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo máquina</Label>
              <Input value={tipoMaquina} onChange={(e) => setTipoMaquina(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clientes.map((c: AdminClienteRow) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sede</Label>
              <Select value={sedeId} onValueChange={setSedeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin sede</SelectItem>
                  {sedes.map((s: AdminSedeOption) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label className="cursor-pointer">Activo</Label>
              <Switch checked={activo} onCheckedChange={setActivo} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#cf1b22] hover:bg-[#a81419] text-white"
              disabled={pending}
              onClick={() => void save()}
            >
              {pending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
