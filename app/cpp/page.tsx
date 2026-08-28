"use client";

import { useState, useMemo, useCallback } from "react";
import { useCppCatalog } from '@/hooks/use-cpp';
import { mapCatalogToCppPart } from '@/lib/cpp/map-catalog-item';
import type { CppCatalogItem } from '@/types/database';
import { useUserStore } from '@/store';
import { CppAdminImportPanel } from '@/components/modules/cpp-admin-import-panel';
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  LayoutGrid,
  List,
  Package,
  ShoppingCart,
  Download,
  FileText,
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  ChevronDown,
  MapPin,
  Clock,
  Layers,
  BarChart3,
  ArrowUpDown,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useCartStore } from "@/store";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Part {
  id: string;
  sapCode: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  price: number;
  listPrice: number;
  stock: number;
  minStock: number;
  warehouse: string;
  shelf: string;
  leadTime: string;
  compatibility: string[];
  lastUpdated: string;
  manuals: { title: string; url: string }[];
}

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
type ViewMode = "grid" | "list";
type SortKey = "relevance" | "price_asc" | "price_desc" | "stock";

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PARTS: Part[] = [
  {
    id: "part-001",
    sapCode: "CPP-0001-SA",
    name: "Filtro de Aceite Motor Caterpillar 3406",
    description: "Filtro de aceite de alta eficiencia para motores Caterpillar serie 3406. Elimina partículas contaminantes hasta 10 micrones. Compatible con aceites minerales y sintéticos.",
    brand: "Caterpillar",
    category: "Filters",
    price: 185000,
    listPrice: 220000,
    stock: 32,
    minStock: 10,
    warehouse: "Bogotá Centro",
    shelf: "A-12-03",
    leadTime: "2 días hábiles",
    compatibility: ["CAT 3406", "CAT 3408", "CAT D9T"],
    lastUpdated: "2024-12-01T08:30:00Z",
    manuals: [
      { title: "Manual Instalación Filtro 3406", url: "#manual-001" },
      { title: "Guía de Mantenimiento Preventivo", url: "#manual-002" },
    ],
  },
  {
    id: "part-002",
    sapCode: "CPP-0002-SA",
    name: "Bomba Hidráulica Komatsu PC200",
    description: "Bomba hidráulica de pistones axiales para excavadoras Komatsu PC200. Presión máxima 350 bar. Caudal nominal 180 L/min a 1800 RPM.",
    brand: "Komatsu",
    category: "Hydraulics",
    price: 2850000,
    listPrice: 3200000,
    stock: 4,
    minStock: 2,
    warehouse: "Bogotá Centro",
    shelf: "B-05-01",
    leadTime: "5 días hábiles",
    compatibility: ["Komatsu PC200-8", "Komatsu PC210-8", "Komatsu PC240"],
    lastUpdated: "2024-11-28T14:15:00Z",
    manuals: [
      { title: "Manual Técnico Bomba PC200", url: "#manual-003" },
    ],
  },
  {
    id: "part-003",
    sapCode: "CPP-0003-SA",
    name: "Filtro Hidráulico Volvo EC480E",
    description: "Filtro de retorno hidráulico para excavadoras Volvo EC480E. Beta ratio 200 a 10 micrones. Capacidad de retención 95g.",
    brand: "Volvo",
    category: "Filters",
    price: 320000,
    listPrice: 380000,
    stock: 18,
    minStock: 8,
    warehouse: "Medellín",
    shelf: "C-08-02",
    leadTime: "3 días hábiles",
    compatibility: ["Volvo EC480E", "Volvo EC380D", "Volvo EC350"],
    lastUpdated: "2024-12-02T10:00:00Z",
    manuals: [
      { title: "Procedimiento Cambio Filtro Hidráulico", url: "#manual-004" },
      { title: "Especificaciones Técnicas EC480E", url: "#manual-005" },
    ],
  },
  {
    id: "part-004",
    sapCode: "CPP-0004-SA",
    name: "Kit Sello Cilindro de Giro Caterpillar 336",
    description: "Kit completo de sellos para cilindro de giro. Incluye O-rings, sellos de labio y respaldos. Material NBR de alta resistencia química.",
    brand: "Caterpillar",
    category: "Hydraulics",
    price: 420000,
    listPrice: 490000,
    stock: 9,
    minStock: 5,
    warehouse: "Bogotá Centro",
    shelf: "A-03-07",
    leadTime: "2 días hábiles",
    compatibility: ["CAT 336", "CAT 330D", "CAT 320E"],
    lastUpdated: "2024-11-30T09:45:00Z",
    manuals: [
      { title: "Manual Reparación Cilindros Hidráulicos", url: "#manual-006" },
    ],
  },
  {
    id: "part-005",
    sapCode: "CPP-0005-SA",
    name: "Correa Dentada Transmisión John Deere 644K",
    description: "Correa dentada para transmisión principal de cargador frontal John Deere 644K. 180 dientes, paso 14mm. Material: poliuretano reforzado con fibra de carbono.",
    brand: "John Deere",
    category: "Transmission",
    price: 680000,
    listPrice: 750000,
    stock: 6,
    minStock: 3,
    warehouse: "Cali",
    shelf: "D-11-04",
    leadTime: "4 días hábiles",
    compatibility: ["John Deere 644K", "John Deere 624K", "John Deere 544K"],
    lastUpdated: "2024-12-01T11:20:00Z",
    manuals: [
      { title: "Manual Transmisión 644K Serie II", url: "#manual-007" },
      { title: "Guía Diagnóstico Correa Dentada", url: "#manual-008" },
    ],
  },
  {
    id: "part-006",
    sapCode: "CPP-0006-SA",
    name: "Pastilla de Freno Bobcat S650",
    description: "Set pastillas de freno para minicar gador Bobcat S650. Material semi-metálico. Par por eje. Compatibles con frenos de disco hidráulicos OEM.",
    brand: "Bobcat",
    category: "Brakes",
    price: 290000,
    listPrice: 340000,
    stock: 0,
    minStock: 4,
    warehouse: "Bogotá Centro",
    shelf: "E-02-09",
    leadTime: "7 días hábiles",
    compatibility: ["Bobcat S650", "Bobcat S590", "Bobcat S570"],
    lastUpdated: "2024-11-25T16:00:00Z",
    manuals: [
      { title: "Manual Sistema de Frenos S650", url: "#manual-009" },
    ],
  },
  {
    id: "part-007",
    sapCode: "CPP-0007-SA",
    name: "Alternador 24V Hitachi ZX350LC-6",
    description: "Alternador trifásico 24V / 80A para excavadoras Hitachi ZX350. Incluye regulador de voltaje integrado. Certificado ISO 9001.",
    brand: "Hitachi",
    category: "Electrical",
    price: 1250000,
    listPrice: 1480000,
    stock: 3,
    minStock: 2,
    warehouse: "Bogotá Centro",
    shelf: "F-07-01",
    leadTime: "5 días hábiles",
    compatibility: ["Hitachi ZX350LC-6", "Hitachi ZX300-6", "Hitachi ZX280"],
    lastUpdated: "2024-12-02T07:30:00Z",
    manuals: [
      { title: "Esquema Eléctrico ZX350LC-6", url: "#manual-010" },
      { title: "Procedimiento Cambio Alternador", url: "#manual-011" },
    ],
  },
  {
    id: "part-008",
    sapCode: "CPP-0008-SA",
    name: "Punta de Cucharon GET Caterpillar 330D",
    description: "Punta de cucharon tipo J con pasador y retén. Aleación de acero de alta resistencia al desgaste Boron Steel. Peso 8.5 kg. Vida útil estimada 800 horas.",
    brand: "Caterpillar",
    category: "Wear Parts",
    price: 165000,
    listPrice: 195000,
    stock: 48,
    minStock: 20,
    warehouse: "Medellín",
    shelf: "G-01-02",
    leadTime: "1 día hábil",
    compatibility: ["CAT 330D", "CAT 320E", "CAT 336"],
    lastUpdated: "2024-12-03T08:00:00Z",
    manuals: [
      { title: "Catálogo GET Caterpillar 2024", url: "#manual-012" },
    ],
  },
  {
    id: "part-009",
    sapCode: "CPP-0009-SA",
    name: "Filtro de Aire Primario Komatsu PC360",
    description: "Filtro de aire primario con prefiltro ciclónico para excavadoras Komatsu PC360. Eficiencia de filtración 99.9% a 5 micrones. Cambio recomendado cada 500 horas.",
    brand: "Komatsu",
    category: "Filters",
    price: 245000,
    listPrice: 290000,
    stock: 22,
    minStock: 8,
    warehouse: "Cali",
    shelf: "H-04-06",
    leadTime: "2 días hábiles",
    compatibility: ["Komatsu PC360-11", "Komatsu PC350-8", "Komatsu PC300-8"],
    lastUpdated: "2024-11-29T13:00:00Z",
    manuals: [
      { title: "Manual Mantenimiento PC360-11", url: "#manual-013" },
    ],
  },
  {
    id: "part-010",
    sapCode: "CPP-0010-SA",
    name: "Válvula de Alivio Hidráulica Volvo A40G",
    description: "Válvula de alivio de presión directa para circuito hidráulico principal. Rango ajustable 200-400 bar. Conexión SAE 3/4\". Cuerpo de acero inoxidable.",
    brand: "Volvo",
    category: "Hydraulics",
    price: 890000,
    listPrice: 1050000,
    stock: 7,
    minStock: 3,
    warehouse: "Bogotá Centro",
    shelf: "B-09-03",
    leadTime: "4 días hábiles",
    compatibility: ["Volvo A40G", "Volvo A35G", "Volvo A30G"],
    lastUpdated: "2024-11-27T15:45:00Z",
    manuals: [
      { title: "Manual Hidráulico A40G", url: "#manual-014" },
      { title: "Procedimiento Ajuste Válvulas", url: "#manual-015" },
    ],
  },
  {
    id: "part-011",
    sapCode: "CPP-0011-SA",
    name: "Motor de Giro Final Drive Komatsu D375A",
    description: "Motor hidráulico de pistones radiales para sistema de giro en buldócer Komatsu D375A. Torque nominal 1200 Nm. Desplazamiento 250 cc/rev.",
    brand: "Komatsu",
    category: "Hydraulics",
    price: 3450000,
    listPrice: 3900000,
    stock: 1,
    minStock: 1,
    warehouse: "Bogotá Centro",
    shelf: "B-01-01",
    leadTime: "10 días hábiles",
    compatibility: ["Komatsu D375A-6", "Komatsu D375A-5"],
    lastUpdated: "2024-11-20T10:00:00Z",
    manuals: [
      { title: "Manual Overhaul D375A", url: "#manual-016" },
    ],
  },
  {
    id: "part-012",
    sapCode: "CPP-0012-SA",
    name: "Sensor de Temperatura Motor John Deere 870G",
    description: "Sensor NTC de temperatura de refrigerante para motoconformadoras John Deere 870G. Rango -40°C a 150°C. Conector Deutsch 2 pines.",
    brand: "John Deere",
    category: "Electrical",
    price: 75000,
    listPrice: 95000,
    stock: 15,
    minStock: 5,
    warehouse: "Medellín",
    shelf: "F-03-08",
    leadTime: "2 días hábiles",
    compatibility: ["John Deere 870G", "John Deere 770G", "John Deere 670G"],
    lastUpdated: "2024-12-01T09:15:00Z",
    manuals: [
      { title: "Manual Diagnóstico Electrónico 870G", url: "#manual-017" },
    ],
  },
  {
    id: "part-013",
    sapCode: "CPP-0013-SA",
    name: "Zapata de Oruga Caterpillar D8T 610mm",
    description: "Zapata de oruga triple griffe 610mm de ancho para buldócer Caterpillar D8T. Material SAE 9255 tratado térmicamente. Incluye pernos de fijación.",
    brand: "Caterpillar",
    category: "Wear Parts",
    price: 580000,
    listPrice: 670000,
    stock: 26,
    minStock: 12,
    warehouse: "Bogotá Centro",
    shelf: "G-03-01",
    leadTime: "1 día hábil",
    compatibility: ["CAT D8T", "CAT D8R", "CAT D8N"],
    lastUpdated: "2024-12-02T12:00:00Z",
    manuals: [
      { title: "Catálogo Tren de Rodaje CAT 2024", url: "#manual-018" },
    ],
  },
  {
    id: "part-014",
    sapCode: "CPP-0014-SA",
    name: "Filtro Combustible Separador Agua Volvo L180H",
    description: "Filtro de combustible con separador de agua integrado para cargadores Volvo L180H. Eficiencia 98% a 5 micrones. Incluye sensor de agua.",
    brand: "Volvo",
    category: "Filters",
    price: 195000,
    listPrice: 230000,
    stock: 14,
    minStock: 6,
    warehouse: "Cali",
    shelf: "H-06-04",
    leadTime: "2 días hábiles",
    compatibility: ["Volvo L180H", "Volvo L150H", "Volvo L120H"],
    lastUpdated: "2024-11-28T11:30:00Z",
    manuals: [
      { title: "Manual Motor D13 Volvo", url: "#manual-019" },
    ],
  },
  {
    id: "part-015",
    sapCode: "CPP-0015-SA",
    name: "Disco de Freno Servicio Bobcat T770",
    description: "Disco de freno sólido para sistema de freno de servicio Bobcat T770. Diámetro 280mm, espesor 12mm. Material fundición gris perlítica GG25.",
    brand: "Bobcat",
    category: "Brakes",
    price: 460000,
    listPrice: 540000,
    stock: 5,
    minStock: 3,
    warehouse: "Medellín",
    shelf: "E-05-02",
    leadTime: "3 días hábiles",
    compatibility: ["Bobcat T770", "Bobcat T650", "Bobcat T590"],
    lastUpdated: "2024-11-30T14:00:00Z",
    manuals: [
      { title: "Manual Frenos T770 Serie 2", url: "#manual-020" },
    ],
  },
  {
    id: "part-016",
    sapCode: "CPP-0016-SA",
    name: "ECM Módulo Control Motor Hitachi ZX210-6",
    description: "Módulo de control electrónico (ECM) para motor Isuzu 6HK1X en excavadoras Hitachi ZX210-6. Programado de fábrica. Incluye cable de diagnóstico.",
    brand: "Hitachi",
    category: "Electrical",
    price: 2100000,
    listPrice: 2480000,
    stock: 2,
    minStock: 1,
    warehouse: "Bogotá Centro",
    shelf: "F-01-01",
    leadTime: "7 días hábiles",
    compatibility: ["Hitachi ZX210-6", "Hitachi ZX200-6", "Hitachi ZX180"],
    lastUpdated: "2024-11-22T08:00:00Z",
    manuals: [
      { title: "Manual ECM Isuzu 6HK1X", url: "#manual-021" },
      { title: "Procedimiento Programación ECM", url: "#manual-022" },
    ],
  },
  {
    id: "part-017",
    sapCode: "CPP-0017-SA",
    name: "Eje de Transmisión John Deere 850K",
    description: "Eje de transmisión cardán para buldócer John Deere 850K. Longitud 480mm, crucetas Spicer 1480. Balanceado dinámicamente de fábrica.",
    brand: "John Deere",
    category: "Transmission",
    price: 1750000,
    listPrice: 2050000,
    stock: 3,
    minStock: 1,
    warehouse: "Bogotá Centro",
    shelf: "C-02-05",
    leadTime: "5 días hábiles",
    compatibility: ["John Deere 850K", "John Deere 750K"],
    lastUpdated: "2024-11-26T10:30:00Z",
    manuals: [
      { title: "Manual Tren de Potencia 850K", url: "#manual-023" },
    ],
  },
  {
    id: "part-018",
    sapCode: "CPP-0018-SA",
    name: "Manguera Hidráulica Alta Presión 3/4\" R2AT",
    description: "Manguera hidráulica de alta presión SAE 100R2AT 3/4\" con terminaciones JIC 37°. Presión de trabajo 250 bar. Longitud 1.5 metros.",
    brand: "Caterpillar",
    category: "Hydraulics",
    price: 135000,
    listPrice: 160000,
    stock: 35,
    minStock: 15,
    warehouse: "Medellín",
    shelf: "B-12-08",
    leadTime: "1 día hábil",
    compatibility: ["CAT 330D", "CAT 336", "CAT 320E", "CAT 323"],
    lastUpdated: "2024-12-03T07:00:00Z",
    manuals: [
      { title: "Catálogo Mangueras CAT 2024", url: "#manual-024" },
    ],
  },
  {
    id: "part-019",
    sapCode: "CPP-0019-SA",
    name: "Turbocompresor Motor Komatsu SAA6D125",
    description: "Turbocompresor de geometría variable para motor Komatsu SAA6D125E-5. Presión de sobrealimentación 2.2 bar. Incluye juntas y pernos de montaje.",
    brand: "Komatsu",
    category: "Engine",
    price: 3200000,
    listPrice: 3650000,
    stock: 2,
    minStock: 1,
    warehouse: "Bogotá Centro",
    shelf: "A-01-01",
    leadTime: "8 días hábiles",
    compatibility: ["Komatsu PC490-11", "Komatsu PC450-8", "Komatsu WA500"],
    lastUpdated: "2024-11-18T09:00:00Z",
    manuals: [
      { title: "Manual Motor SAA6D125E-5", url: "#manual-025" },
      { title: "Procedimiento Cambio Turbocompresor", url: "#manual-026" },
    ],
  },
  {
    id: "part-020",
    sapCode: "CPP-0020-SA",
    name: "Camisa de Cilindro Volvo EC950F D16",
    description: "Camisa seca para cilindro de motor Volvo D16E. Diámetro interior 144mm, longitud 250mm. Material hierro fundido centrifugado. Cromado duro interior.",
    brand: "Volvo",
    category: "Engine",
    price: 980000,
    listPrice: 1150000,
    stock: 8,
    minStock: 4,
    warehouse: "Cali",
    shelf: "A-06-03",
    leadTime: "5 días hábiles",
    compatibility: ["Volvo EC950F", "Volvo EC750D", "Volvo EC700B"],
    lastUpdated: "2024-11-24T13:45:00Z",
    manuals: [
      { title: "Manual Motor D16 Volvo Serie 2", url: "#manual-027" },
    ],
  },
];

const BRANDS = ["Caterpillar", "Komatsu", "Volvo", "John Deere", "Bobcat", "Hitachi"];
const CATEGORIES = ["Engine", "Hydraulics", "Transmission", "Brakes", "Electrical", "Filters", "Wear Parts"];
const WAREHOUSES_LIST = ["Bogotá Centro", "Medellín", "Cali"];

const CATEGORY_LABEL: Record<string, string> = {
  Engine: "Motor",
  Hydraulics: "Hidráulica",
  Transmission: "Transmisión",
  Brakes: "Frenos",
  Electrical: "Eléctrico",
  Filters: "Filtros",
  "Wear Parts": "Piezas de Desgaste",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock === 0) return "out_of_stock";
  if (stock <= minStock) return "low_stock";
  return "in_stock";
}

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  const status = getStockStatus(stock, minStock);
  if (status === "in_stock")
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1 font-medium">
        <CheckCircle2 className="h-3 w-3" />
        En Stock ({stock})
      </Badge>
    );
  if (status === "low_stock")
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1 font-medium">
        <AlertTriangle className="h-3 w-3" />
        Stock Bajo ({stock})
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1 font-medium">
      <XCircle className="h-3 w-3" />
      Sin Stock
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Sidebar
// ─────────────────────────────────────────────────────────────────────────────

interface FiltersState {
  sapSearch: string;
  brands: string[];
  category: string;
  priceRange: [number, number];
  inStockOnly: boolean;
  warehouses: string[];
}

const DEFAULT_FILTERS: FiltersState = {
  sapSearch: "",
  brands: [],
  category: "",
  priceRange: [0, 5000000],
  inStockOnly: false,
  warehouses: [],
};

function FilterSidebar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: {
  filters: FiltersState;
  onChange: (f: FiltersState) => void;
  resultCount: number;
  totalCount: number;
}) {
  const toggle = <K extends "brands" | "warehouses">(key: K, val: string) => {
    const arr = filters[key] as string[];
    onChange({
      ...filters,
      [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
    });
  };

  return (
    <aside className="w-[260px] flex-shrink-0 bg-card border border-border rounded-xl p-4 flex flex-col gap-4 h-fit sticky top-0 z-20 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-[#cf1b22]" />
          Filtros
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          Resetear
        </Button>
      </div>

      <Separator />

      {/* SAP Search */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Código SAP
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="CPP-0001-SA"
            className="pl-8 h-8 text-sm"
            value={filters.sapSearch}
            onChange={(e) => onChange({ ...filters, sapSearch: e.target.value })}
          />
        </div>
      </div>

      {/* Brand */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Marca
        </Label>
        <div className="space-y-1.5">
          {BRANDS.map((brand) => (
            <div key={brand} className="flex items-center gap-2">
              <Checkbox
                id={`brand-${brand}`}
                checked={filters.brands.includes(brand)}
                onCheckedChange={() => toggle("brands", brand)}
                className="data-[state=checked]:bg-[#cf1b22] data-[state=checked]:border-[#cf1b22]"
              />
              <Label htmlFor={`brand-${brand}`} className="text-sm font-normal cursor-pointer">
                {brand}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Categoría
        </Label>
        <Select
          value={filters.category}
          onValueChange={(v) => onChange({ ...filters, category: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABEL[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Rango de Precio
        </Label>
        <Slider
          min={0}
          max={5000000}
          step={50000}
          value={filters.priceRange}
          onValueChange={(val) =>
            onChange({ ...filters, priceRange: val as [number, number] })
          }
          className="[&_.slider-thumb]:bg-[#cf1b22] [&_.slider-range]:bg-[#cf1b22]"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatCOP(filters.priceRange[0])}</span>
          <span>{formatCOP(filters.priceRange[1])}</span>
        </div>
      </div>

      {/* In Stock Only */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal cursor-pointer">Solo en stock</Label>
        <Switch
          checked={filters.inStockOnly}
          onCheckedChange={(v) => onChange({ ...filters, inStockOnly: v })}
          className="data-[state=checked]:bg-[#cf1b22]"
        />
      </div>

      {/* Sede / Bodega */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Sede
        </Label>
        <div className="space-y-1.5">
          {WAREHOUSES_LIST.map((wh) => (
            <div key={wh} className="flex items-center gap-2">
              <Checkbox
                id={`wh-${wh}`}
                checked={filters.warehouses.includes(wh)}
                onCheckedChange={() => toggle("warehouses", wh)}
                className="data-[state=checked]:bg-[#cf1b22] data-[state=checked]:border-[#cf1b22]"
              />
              <Label htmlFor={`wh-${wh}`} className="text-sm font-normal cursor-pointer">
                {wh}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <p className="text-xs text-muted-foreground text-center">
        Mostrando <span className="font-semibold text-foreground">{resultCount}</span> de{" "}
        <span className="font-semibold text-foreground">{totalCount}</span> repuestos
      </p>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Part Card (List View)
// ─────────────────────────────────────────────────────────────────────────────

function PartCardList({
  part,
  isSelected,
  onSelect,
  onAddToCart,
}: {
  part: Part;
  isSelected: boolean;
  onSelect: (p: Part) => void;
  onAddToCart: (p: Part) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "bg-card border rounded-lg p-4 cursor-pointer transition-all duration-150",
        "hover:border-[#cf1b22]/50 hover:shadow-sm",
        isSelected && "border-[#cf1b22] shadow-md ring-1 ring-[#cf1b22]/20"
      )}
      onClick={() => onSelect(part)}
    >
      <div className="flex items-start gap-4">
        {/* Icon placeholder */}
        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="font-mono text-xs text-[#cf1b22] border-[#cf1b22]/40 bg-[#cf1b22]/5 shrink-0"
                >
                  {part.sapCode}
                </Badge>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {CATEGORY_LABEL[part.category] ?? part.category}
                </Badge>
              </div>
              <p className="font-semibold text-sm mt-1 truncate">{part.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{part.description}</p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {part.compatibility.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Right side: price + stock + action */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <p className="font-bold text-base text-foreground whitespace-nowrap">
                {formatCOP(part.price)}
              </p>
              <StockBadge stock={part.stock} minStock={part.minStock} />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {part.warehouse}
              </div>
              <Button
                size="sm"
                className="h-7 text-xs bg-[#cf1b22] hover:bg-[#b01820] text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(part);
                }}
                disabled={part.stock === 0}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Part Card (Grid View)
// ─────────────────────────────────────────────────────────────────────────────

function PartCardGrid({
  part,
  isSelected,
  onSelect,
  onAddToCart,
}: {
  part: Part;
  isSelected: boolean;
  onSelect: (p: Part) => void;
  onAddToCart: (p: Part) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        "bg-card border rounded-lg p-4 cursor-pointer transition-all duration-150 flex flex-col gap-3",
        "hover:border-[#cf1b22]/50 hover:shadow-sm",
        isSelected && "border-[#cf1b22] shadow-md ring-1 ring-[#cf1b22]/20"
      )}
      onClick={() => onSelect(part)}
    >
      <div className="h-28 rounded-md bg-muted flex items-center justify-center">
        <Package className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <div>
        <Badge
          variant="outline"
          className="font-mono text-xs text-[#cf1b22] border-[#cf1b22]/40 bg-[#cf1b22]/5"
        >
          {part.sapCode}
        </Badge>
        <p className="font-semibold text-sm mt-1 line-clamp-2">{part.name}</p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <p className="font-bold text-base">{formatCOP(part.price)}</p>
        <StockBadge stock={part.stock} minStock={part.minStock} />
      </div>
      <Button
        size="sm"
        className="w-full h-7 text-xs bg-[#cf1b22] hover:bg-[#b01820] text-white"
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart(part);
        }}
        disabled={part.stock === 0}
      >
        <ShoppingCart className="h-3 w-3 mr-1" />
        Agregar al carrito
      </Button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Cards
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard({ mode }: { mode: ViewMode }) {
  if (mode === "list") {
    return (
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-7 w-20" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-card border rounded-lg p-4 flex flex-col gap-3">
      <Skeleton className="h-28 w-full rounded-md" />
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-7 w-full" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">Sin resultados</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        No se encontraron repuestos con los filtros aplicados. Ajusta los criterios de búsqueda.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

function DetailPanel({ part, onAddToCart }: { part: Part | null; onAddToCart: (p: Part) => void }) {
  const cartItems = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.total);
  const itemCount = useCartStore((s) => s.itemCount);

  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">Selecciona un repuesto para ver los detalles</p>
      </div>
    );
  }

  const discountPct = Math.round(((part.listPrice - part.price) / part.listPrice) * 100);

  return (
    <motion.div
      key={part.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="flex flex-col gap-4"
    >
      {/* Image placeholder */}
      <div className="h-[200px] rounded-xl bg-muted flex items-center justify-center border border-border">
        <Package className="h-16 w-16 text-muted-foreground/30" />
      </div>

      {/* SAP + Name */}
      <div>
        <Badge
          variant="outline"
          className="font-mono text-xs text-[#cf1b22] border-[#cf1b22]/40 bg-[#cf1b22]/5 mb-2"
        >
          {part.sapCode}
        </Badge>
        <h2 className="font-bold text-base leading-snug">{part.name}</h2>
        <p className="text-xs text-muted-foreground mt-1">{part.description}</p>
      </div>

      {/* Info chips */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Layers, label: "Categoría", value: CATEGORY_LABEL[part.category] ?? part.category },
          { icon: MapPin, label: "Bodega", value: part.warehouse },
          { icon: Clock, label: "Tiempo de Entrega", value: part.leadTime },
          { icon: BarChart3, label: "Stock Mín.", value: `${part.minStock} uds.` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xs font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <Separator />

      {/* SAP Information */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Información SAP
        </h3>
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-xs text-muted-foreground">Precio neto</span>
            <span className="text-xl font-bold text-foreground">{formatCOP(part.price)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Precio de lista</span>
            <div className="flex items-center gap-2">
              <span className="text-xs line-through text-muted-foreground">{formatCOP(part.listPrice)}</span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">-{discountPct}%</Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Stock actual</span>
            <StockBadge stock={part.stock} minStock={part.minStock} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ubicación</span>
            <span className="text-xs font-medium">{part.warehouse} · {part.shelf}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Actualizado</span>
            <span className="text-xs text-muted-foreground">
              {new Date(part.lastUpdated).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Compatibility */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Compatibilidad
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {part.compatibility.map((c) => (
            <span
              key={c}
              className="text-xs bg-[#cf1b22]/8 text-[#cf1b22] border border-[#cf1b22]/20 px-2 py-0.5 rounded-full font-medium"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Related Manuals */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Manuales Relacionados
        </h3>
        <div className="space-y-1.5">
          {part.manuals.map((manual) => (
            <div
              key={manual.url}
              className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 text-[#cf1b22] flex-shrink-0" />
                <span className="text-xs text-foreground truncate">{manual.title}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 flex-shrink-0" asChild>
                <a href={manual.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver
                </a>
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button
          className="w-full bg-[#cf1b22] hover:bg-[#b01820] text-white"
          onClick={() => onAddToCart(part)}
          disabled={part.stock === 0}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Agregar al Carrito
        </Button>
        <Button variant="outline" className="w-full">
          <FileText className="h-4 w-4 mr-2" />
          Generar Cotización
        </Button>
        <Button variant="ghost" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Exportar a Excel
        </Button>
      </div>

      {/* Cart Summary */}
      {itemCount() > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#cf1b22]/5 border border-[#cf1b22]/20 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-[#cf1b22]" />
            <span className="text-sm font-semibold text-[#cf1b22]">
              Carrito ({itemCount()} {itemCount() === 1 ? "ítem" : "ítems"})
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold">{formatCOP(cartTotal())}</span>
          </div>
          <Button size="sm" variant="outline" className="w-full h-7 text-xs border-[#cf1b22] text-[#cf1b22] hover:bg-[#cf1b22]/5">
            Ver Carrito
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cart Drawer
// ─────────────────────────────────────────────────────────────────────────────

function CartDrawer() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const total = useCartStore((s) => s.total);
  const itemCount = useCartStore((s) => s.itemCount);

  const subtotal = total();
  const vat = Math.round(subtotal * 0.19);
  const grandTotal = subtotal + vat;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative h-8 gap-1.5">
          <ShoppingCart className="h-4 w-4" />
          <span className="text-xs">Carrito</span>
          {itemCount() > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#cf1b22] text-white text-[10px] font-bold flex items-center justify-center">
              {itemCount()}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[440px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#cf1b22]" />
            Carrito de Repuestos
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {items.map((item) => (
                <div key={item.partId} className="bg-muted/40 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] text-[#cf1b22] border-[#cf1b22]/40 mb-1"
                      >
                        {item.sapCode}
                      </Badge>
                      <p className="text-xs font-medium line-clamp-2">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.brand}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeItem(item.partId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => updateQuantity(item.partId, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => updateQuantity(item.partId, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-bold">{formatCOP(item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCOP(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA (19%)</span>
                  <span>{formatCOP(vat)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCOP(grandTotal)}</span>
                </div>
              </div>
              <Button className="w-full bg-[#cf1b22] hover:bg-[#b01820] text-white">
                <FileText className="h-4 w-4 mr-2" />
                Generar Cotización
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-destructive"
                onClick={clearCart}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Carrito
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CppPage() {
  const { role } = useUserStore();
  const canImport = role === 'Administrator' || role === 'Coordinator';

  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortKey, setSortKey] = useState<SortKey>("relevance");
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  const { data: catalogData, isLoading } = useCppCatalog({
    marca: filters.brands[0],
    search: filters.sapSearch || undefined,
  });

  const catalogParts = useMemo((): Part[] => {
    if (catalogData?.length) {
      return catalogData.map((item: CppCatalogItem) => mapCatalogToCppPart(item) as Part);
    }
    return MOCK_PARTS;
  }, [catalogData]);

  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = useCallback(
    (part: Part) => {
      addItem({
        partId: part.id,
        sapCode: part.sapCode,
        description: part.name,
        brand: part.brand,
        unitPrice: part.price,
        quantity: 1,
      });
    },
    [addItem]
  );

  const filteredParts = useMemo(() => {
    let parts = [...catalogParts];

    if (filters.sapSearch) {
      const q = filters.sapSearch.toLowerCase();
      parts = parts.filter(
        (p) =>
          p.sapCode.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      );
    }
    if (filters.brands.length > 0) {
      parts = parts.filter((p) => filters.brands.includes(p.brand));
    }
    if (filters.category) {
      parts = parts.filter((p) => p.category === filters.category);
    }
    parts = parts.filter(
      (p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );
    if (filters.inStockOnly) {
      parts = parts.filter((p) => p.stock > 0);
    }
    if (filters.warehouses.length > 0) {
      parts = parts.filter((p) => filters.warehouses.includes(p.warehouse));
    }

    switch (sortKey) {
      case "price_asc":
        parts.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        parts.sort((a, b) => b.price - a.price);
        break;
      case "stock":
        parts.sort((a, b) => b.stock - a.stock);
        break;
    }

    return parts;
  }, [filters, sortKey, catalogParts]);

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-[#cf1b22]" />
            Repuestos Inteligentes CPP
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consulta inteligente de repuestos con información SAP en tiempo real
          </p>
        </div>
        <CartDrawer />
      </div>

      {/* Three-column layout */}
      <div className="flex gap-4 items-start">
        {/* LEFT: Filters */}
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          resultCount={filteredParts.length}
          totalCount={MOCK_PARTS.length}
        />

        {/* CENTER: Parts Grid/List */}
        <div className="flex-1 min-w-[400px] flex flex-col gap-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ordenar:</span>
              <Select
                value={sortKey}
                onValueChange={(v) => setSortKey(v as SortKey)}
              >
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevancia</SelectItem>
                  <SelectItem value="price_asc">Precio ASC</SelectItem>
                  <SelectItem value="price_desc">Precio DESC</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors",
                  viewMode === "list"
                    ? "bg-[#cf1b22] text-white"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
                Lista
              </button>
              <button
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors",
                  viewMode === "grid"
                    ? "bg-[#cf1b22] text-white"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-2 xl:grid-cols-3 gap-3"
                  : "flex flex-col gap-2"
              )}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} mode={viewMode} />
              ))}
            </div>
          ) : filteredParts.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence mode="popLayout">
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-2 xl:grid-cols-3 gap-3"
                    : "flex flex-col gap-2"
                )}
              >
                {filteredParts.map((part) =>
                  viewMode === "list" ? (
                    <PartCardList
                      key={part.id}
                      part={part}
                      isSelected={selectedPart?.id === part.id}
                      onSelect={setSelectedPart}
                      onAddToCart={handleAddToCart}
                    />
                  ) : (
                    <PartCardGrid
                      key={part.id}
                      part={part}
                      isSelected={selectedPart?.id === part.id}
                      onSelect={setSelectedPart}
                      onAddToCart={handleAddToCart}
                    />
                  )
                )}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* RIGHT: Detail Panel */}
        <aside className="w-[320px] flex-shrink-0 bg-card border border-border rounded-xl p-4 sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <AnimatePresence mode="wait">
            <DetailPanel
              key={selectedPart?.id ?? "empty"}
              part={selectedPart}
              onAddToCart={handleAddToCart}
            />
          </AnimatePresence>
        </aside>
      </div>

      {canImport && (
        <div className="mt-4">
          <CppAdminImportPanel />
        </div>
      )}
    </div>
  );
}
