import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Zap, User, Smartphone, Clock } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const FULFILLMENT_MODES = [
  { key: "instant", label: "Instant Stock Delivery", icon: Zap, description: "Auto-delivers credentials from stock" },
  { key: "custom_username", label: "Custom Username Required", icon: User, description: "Customer provides username/email" },
  { key: "imei", label: "IMEI Required", icon: Smartphone, description: "Customer provides device IMEI" },
  { key: "manual", label: "Manual Processing", icon: Clock, description: "Admin manually fulfills order" },
] as const;

const DEFAULT_DELIVERY_TIMES: Record<string, string> = {
  instant: "Instant Delivery",
  custom_username: "5–30 Minutes",
  imei: "5–30 Minutes",
  manual: "1–24 Hours",
};

interface CustomField {
  id?: string;
  field_name: string;
  field_type: string;
  required: boolean;
  min_length: number | null;
  max_length: number | null;
  linked_mode: string;
  options: string[] | null;
  sort_order: number;
}

interface FulfillmentConfigProps {
  productId: string;
  fulfillmentModes: string[];
  deliveryTimeConfig: Record<string, string>;
  onModesChange: (modes: string[]) => void;
  onDeliveryTimeChange: (config: Record<string, string>) => void;
}

export default function FulfillmentConfig({
  productId,
  fulfillmentModes,
  deliveryTimeConfig,
  onModesChange,
  onDeliveryTimeChange,
}: FulfillmentConfigProps) {
  const queryClient = useQueryClient();
  const [newField, setNewField] = useState<CustomField>({
    field_name: "",
    field_type: "text",
    required: true,
    min_length: null,
    max_length: null,
    linked_mode: "",
    options: null,
    sort_order: 0,
  });

  const { data: customFields = [], refetch: refetchFields } = useQuery({
    queryKey: ["product-custom-fields", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data } = await supabase
        .from("product_custom_fields" as any)
        .select("*")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!productId,
  });

  const toggleMode = (mode: string) => {
    const current = [...fulfillmentModes];
    const idx = current.indexOf(mode);
    if (idx >= 0) {
      if (current.length === 1) {
        toast.error("At least one fulfillment mode required");
        return;
      }
      current.splice(idx, 1);
    } else {
      current.push(mode);
    }
    onModesChange(current);
  };

  const updateDeliveryTime = (mode: string, value: string) => {
    onDeliveryTimeChange({ ...deliveryTimeConfig, [mode]: value });
  };

  const addCustomField = async () => {
    if (!newField.field_name.trim() || !newField.linked_mode) {
      toast.error("Field name and linked mode are required");
      return;
    }
    const { error } = await supabase.from("product_custom_fields" as any).insert({
      product_id: productId,
      field_name: newField.field_name.trim(),
      field_type: newField.field_type,
      required: newField.required,
      min_length: newField.min_length,
      max_length: newField.max_length,
      linked_mode: newField.linked_mode,
      sort_order: customFields.length,
    } as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Custom field added");
    setNewField({
      field_name: "",
      field_type: "text",
      required: true,
      min_length: null,
      max_length: null,
      linked_mode: "",
      options: null,
      sort_order: 0,
    });
    refetchFields();
  };

  const deleteField = async (fieldId: string) => {
    const { error } = await supabase
      .from("product_custom_fields" as any)
      .delete()
      .eq("id", fieldId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Field removed");
    refetchFields();
  };

  return (
    <div className="space-y-6">
      {/* Fulfillment Modes */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground">Fulfillment Modes</Label>
        <p className="text-xs text-muted-foreground">Select which fulfillment methods this product supports.</p>
        <div className="space-y-2">
          {FULFILLMENT_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = fulfillmentModes.includes(mode.key);
            return (
              <label
                key={mode.key}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isActive
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/20 border-border hover:border-border"
                }`}
              >
                <Checkbox
                  checked={isActive}
                  onCheckedChange={() => toggleMode(mode.key)}
                />
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{mode.label}</p>
                  <p className="text-[11px] text-muted-foreground">{mode.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Delivery Time Config */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground">Delivery Time Labels</Label>
        <p className="text-xs text-muted-foreground">Customize the delivery time badge for each enabled mode.</p>
        <div className="space-y-2">
          {fulfillmentModes.map((mode) => {
            const modeInfo = FULFILLMENT_MODES.find((m) => m.key === mode);
            return (
              <div key={mode} className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-32 shrink-0 truncate">
                  {modeInfo?.label || mode}
                </span>
                <Input
                  value={deliveryTimeConfig[mode] || DEFAULT_DELIVERY_TIMES[mode] || ""}
                  onChange={(e) => updateDeliveryTime(mode, e.target.value)}
                  className="bg-muted/50 border-border text-sm"
                  placeholder="e.g. Instant Delivery"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Fields - Only show if product exists */}
      {productId && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">Custom Fields</Label>
            <p className="text-xs text-muted-foreground">
              Define fields customers must fill when a specific mode is selected.
            </p>

            {/* Existing fields */}
            {customFields.length > 0 && (
              <div className="space-y-2">
                {customFields.map((field: any) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{field.field_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {field.field_type} · {field.required ? "Required" : "Optional"} ·{" "}
                        {FULFILLMENT_MODES.find((m) => m.key === field.linked_mode)?.label || field.linked_mode}
                        {field.min_length ? ` · Min: ${field.min_length}` : ""}
                        {field.max_length ? ` · Max: ${field.max_length}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteField(field.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new field */}
            <div className="p-3 rounded-lg border border-dashed border-border space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add Field</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newField.field_name}
                  onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                  placeholder="Field name (e.g. Username)"
                  className="bg-muted/50 border-border text-sm"
                />
                <Select
                  value={newField.field_type}
                  onValueChange={(v) => setNewField({ ...newField, field_type: v })}
                >
                  <SelectTrigger className="bg-muted/50 border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={newField.linked_mode}
                  onValueChange={(v) => setNewField({ ...newField, linked_mode: v })}
                >
                  <SelectTrigger className="bg-muted/50 border-border text-sm">
                    <SelectValue placeholder="Linked mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {fulfillmentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {FULFILLMENT_MODES.find((m) => m.key === mode)?.label || mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={newField.min_length ?? ""}
                  onChange={(e) => setNewField({ ...newField, min_length: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Min length"
                  className="bg-muted/50 border-border text-sm"
                />
                <Input
                  type="number"
                  value={newField.max_length ?? ""}
                  onChange={(e) => setNewField({ ...newField, max_length: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Max length"
                  className="bg-muted/50 border-border text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={newField.required}
                    onCheckedChange={(c) => setNewField({ ...newField, required: c })}
                  />
                  <span className="text-xs text-muted-foreground">Required</span>
                </label>
                <Button size="sm" onClick={addCustomField} className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Add Field
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { FULFILLMENT_MODES, DEFAULT_DELIVERY_TIMES };
