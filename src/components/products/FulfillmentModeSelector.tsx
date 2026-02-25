import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, User, Smartphone, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";

const MODE_ICONS: Record<string, any> = {
  instant: Zap,
  custom_username: User,
  imei: Smartphone,
  manual: Clock,
};

const MODE_LABEL_KEYS: Record<string, keyof typeof t.fulfillment> = {
  instant: "instant",
  custom_username: "custom_username",
  imei: "imei",
  manual: "manual",
};

// Keep English-only export for admin pages
const MODE_LABELS: Record<string, string> = {
  instant: "Instant Delivery",
  custom_username: "Custom Username",
  imei: "IMEI Required",
  manual: "Manual Processing",
};

interface FulfillmentModeSelectorProps {
  productId: string;
  fulfillmentModes: string[];
  deliveryTimeConfig: Record<string, string>;
  selectedMode: string;
  onModeChange: (mode: string) => void;
  customFieldValues: Record<string, string>;
  onCustomFieldChange: (fieldName: string, value: string) => void;
  fieldErrors: Record<string, string>;
}

export default function FulfillmentModeSelector({
  productId,
  fulfillmentModes,
  deliveryTimeConfig,
  selectedMode,
  onModeChange,
  customFieldValues,
  onCustomFieldChange,
  fieldErrors,
}: FulfillmentModeSelectorProps) {
  const l = useT();

  const { data: customFields = [] } = useQuery({
    queryKey: ["product-custom-fields", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_custom_fields" as any)
        .select("*")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!productId,
  });

  const activeFields = customFields.filter((f: any) => f.linked_mode === selectedMode);

  if (fulfillmentModes.length <= 1 && activeFields.length === 0) {
    return null;
  }

  const getModeLabel = (mode: string) => {
    const key = MODE_LABEL_KEYS[mode];
    if (key) return l(t.fulfillment[key] as any);
    return mode;
  };

  return (
    <div className="space-y-3">
      {fulfillmentModes.length > 1 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {l(t.fulfillment.accountType)}
          </Label>
          <div className="space-y-1.5">
            {fulfillmentModes.map((mode) => {
              const Icon = MODE_ICONS[mode] || Zap;
              const isSelected = selectedMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onModeChange(mode)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                    isSelected
                      ? "bg-primary/5 border-primary/25 ring-1 ring-primary/10"
                      : "bg-muted/10 border-border hover:border-primary/15 hover:bg-muted/20"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      isSelected ? "border-primary" : "border-muted-foreground/30"
                    )}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {getModeLabel(mode)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {deliveryTimeConfig[mode] || ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeFields.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          {activeFields.map((field: any) => (
            <div key={field.id} className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                {field.field_name}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {field.field_type === "select" && Array.isArray(field.options) && field.options.length > 0 ? (
                <>
                  <Select
                    value={customFieldValues[field.field_name] || ""}
                    onValueChange={(val) => onCustomFieldChange(field.field_name, val)}
                  >
                    <SelectTrigger
                      className={cn(
                        "bg-muted/50 border-border",
                        fieldErrors[field.field_name] && "border-destructive"
                      )}
                    >
                      <SelectValue placeholder={`${field.field_name} ${l(t.fulfillment.selectPlaceholder)}`} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {(field.options as string[]).map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors[field.field_name] && (
                    <p className="text-[11px] text-destructive">{fieldErrors[field.field_name]}</p>
                  )}
                </>
              ) : (
                <>
                  <Input
                    type={field.field_type === "email" ? "email" : field.field_type === "number" ? "number" : "text"}
                    value={customFieldValues[field.field_name] || ""}
                    onChange={(e) => onCustomFieldChange(field.field_name, e.target.value)}
                    placeholder={`${l(t.fulfillment.enterPlaceholder)} ${field.field_name.toLowerCase()}`}
                    minLength={field.min_length || undefined}
                    maxLength={field.max_length || undefined}
                    className={cn(
                      "bg-muted/50 border-border",
                      fieldErrors[field.field_name] && "border-destructive"
                    )}
                  />
                  {fieldErrors[field.field_name] && (
                    <p className="text-[11px] text-destructive">{fieldErrors[field.field_name]}</p>
                  )}
                  {(field.min_length || field.max_length) && (
                    <p className="text-[10px] text-muted-foreground">
                      {field.min_length ? `${l(t.fulfillment.minLabel)}: ${field.min_length} ${l(t.fulfillment.chars)}` : ""}
                      {field.min_length && field.max_length ? " · " : ""}
                      {field.max_length ? `${l(t.fulfillment.maxLabel)}: ${field.max_length} ${l(t.fulfillment.chars)}` : ""}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { MODE_LABELS, MODE_ICONS };
