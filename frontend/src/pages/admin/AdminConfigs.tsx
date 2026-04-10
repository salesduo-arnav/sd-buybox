import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminService, type SystemConfig } from "@/services/admin.service";
import { AdminConfigsSkeleton } from "@/components/admin/AdminConfigsSkeleton";

// ── Category metadata ──────────────────────────────────────────

interface CategoryMeta {
  label: string;
  description: string;
  order: number;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  scanning:       { label: "Scanning",       description: "Scan behavior, marketplace, and frequency defaults",    order: 1 },
  thresholds:     { label: "Thresholds",     description: "Visibility warning and critical alert thresholds",      order: 2 },
  entitlements:   { label: "Entitlements",   description: "Fallback values when entitlement data is missing",      order: 3 },
  data_retention: { label: "Data Retention", description: "Snapshot and history cleanup settings",                 order: 4 },
  general:        { label: "General",        description: "Other platform settings",                               order: 99 },
};

function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? {
    label: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " "),
    description: "",
    order: 50,
  };
}

// ── Select options for `select`-type configs ───────────────────

const SELECT_OPTIONS: Record<string, { label: string; value: string }[]> = {
  default_update_frequency: [
    { label: "Real-time", value: "real_time" },
    { label: "Hourly",    value: "hourly" },
    { label: "Daily",     value: "daily" },
  ],
  default_marketplace: [
    { label: "US", value: "US" }, { label: "CA", value: "CA" },
    { label: "UK", value: "UK" }, { label: "DE", value: "DE" },
    { label: "FR", value: "FR" }, { label: "IT", value: "IT" },
    { label: "ES", value: "ES" }, { label: "JP", value: "JP" },
    { label: "AU", value: "AU" }, { label: "IN", value: "IN" },
    { label: "MX", value: "MX" }, { label: "BR", value: "BR" },
  ],
  entitlement_frequency_fallback: [
    { label: "Real-time", value: "real_time" },
    { label: "Hourly",    value: "hourly" },
    { label: "Daily",     value: "daily" },
  ],
};

// ── Helpers ─────────────────────────────────────────────────────

function formatKeyLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/** Serialize a JSONB value to a string for display in an input. */
function valueToEditString(value: unknown, type: string): string {
  if (type === "json") {
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }
  if (type === "boolean") return value ? "true" : "false";
  return String(value ?? "");
}

/** Deserialize an edit string back to the correct JS type for the API. */
function editStringToValue(str: string, type: string): unknown {
  switch (type) {
    case "boolean":  return str === "true";
    case "integer":  return parseInt(str, 10);
    case "decimal":  return parseFloat(str);
    case "json":     return JSON.parse(str);
    case "select":   return str;
    case "text":
    default:         return str;
  }
}

// ── Component ──────────────────────────────────────────────────

export default function AdminConfigs() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit state keyed by config key.
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});

  const fetchConfigs = useCallback(async () => {
    try {
      const data = await AdminService.getConfigs();
      setConfigs(data);

      const initial: Record<string, string> = {};
      for (const c of data) {
        initial[c.key] = valueToEditString(c.value, c.type);
      }
      setEditValues(initial);
      setOriginalValues(initial);
    } catch {
      toast.error("Failed to load configurations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleChange = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = (key: string) => {
    setEditValues((prev) => ({ ...prev, [key]: originalValues[key] }));
  };

  const handleSave = async (key: string) => {
    const config = configs.find((c) => c.key === key);
    if (!config) return;

    let parsed: unknown;
    try {
      parsed = editStringToValue(editValues[key], config.type);
    } catch {
      toast.error(`Invalid value for "${formatKeyLabel(key)}"`);
      return;
    }

    setSaving(key);
    try {
      await AdminService.updateConfig(key, parsed);
      toast.success(`"${formatKeyLabel(key)}" updated successfully`);
      setOriginalValues((prev) => ({ ...prev, [key]: editValues[key] }));
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Failed to update configuration";
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  const isDirty = (key: string): boolean => editValues[key] !== originalValues[key];

  // ── Filter + group ────────────────────────────────────────────

  const filtered = configs.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.key.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (editValues[c.key] ?? "").toLowerCase().includes(q)
    );
  });

  const grouped = filtered.reduce<Record<string, SystemConfig[]>>((acc, c) => {
    const cat = c.category || "general";
    (acc[cat] ??= []).push(c);
    return acc;
  }, {});

  const sortedCategories = Object.entries(grouped).sort(
    ([a], [b]) => getCategoryMeta(a).order - getCategoryMeta(b).order,
  );

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">System Configurations</h1>
          <p className="text-muted-foreground">
            Manage system-wide settings. Changes take effect immediately.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <AdminConfigsSkeleton />
      ) : sortedCategories.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            {searchQuery ? "No configurations match your search." : "No configurations found."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(([category, items]) => {
            const meta = getCategoryMeta(category);
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{meta.label}</CardTitle>
                  {meta.description && <CardDescription>{meta.description}</CardDescription>}
                </CardHeader>
                <CardContent className="p-0">
                  {items.map((config) => (
                    <ConfigRow
                      key={config.key}
                      config={config}
                      editValue={editValues[config.key] ?? ""}
                      dirty={isDirty(config.key)}
                      saving={saving === config.key}
                      onChange={(v) => handleChange(config.key, v)}
                      onReset={() => handleReset(config.key)}
                      onSave={() => handleSave(config.key)}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Config Row ──────────────────────────────────────────────────

interface ConfigRowProps {
  config: SystemConfig;
  editValue: string;
  dirty: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
}

function ConfigRow({ config, editValue, dirty, saving, onChange, onReset, onSave }: ConfigRowProps) {
  return (
    <div className="flex flex-col gap-4 p-6 border-b last:border-0 transition-colors">
      {/* Label row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <Label htmlFor={config.key} className="text-base font-medium">
              {formatKeyLabel(config.key)}
            </Label>
            {dirty && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Unsaved
              </Badge>
            )}
          </div>
          {config.description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {config.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <Button size="icon" variant="ghost" onClick={onReset} title="Discard changes">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="outline"
            onClick={onSave}
            disabled={saving || !dirty}
            title="Save configuration"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Input */}
      <div className="w-full">
        <ConfigInput
          configKey={config.key}
          configType={config.type}
          value={editValue}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

// ── Type-driven input ───────────────────────────────────────────

interface ConfigInputProps {
  configKey: string;
  configType: string;
  value: string;
  onChange: (value: string) => void;
}

function ConfigInput({ configKey, configType, value, onChange }: ConfigInputProps) {
  switch (configType) {
    case "boolean":
      return (
        <div className="flex items-center h-10">
          <Switch
            id={configKey}
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
          />
          <span className="ml-3 text-sm text-muted-foreground">
            {value === "true" ? "Enabled" : "Disabled"}
          </span>
        </div>
      );

    case "integer":
      return (
        <Input
          id={configKey}
          type="number"
          step="1"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-xs"
        />
      );

    case "decimal":
      return (
        <Input
          id={configKey}
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-xs"
        />
      );

    case "json":
      return (
        <Textarea
          id={configKey}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm min-h-[80px]"
          rows={6}
        />
      );

    case "select": {
      const options = SELECT_OPTIONS[configKey] ?? [];
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="max-w-xs" id={configKey}>
            <SelectValue placeholder="Select a value" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case "text":
    default:
      return (
        <Input
          id={configKey}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-2xl"
        />
      );
  }
}
