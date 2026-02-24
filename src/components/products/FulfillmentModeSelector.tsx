import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, User, Smartphone, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const MODE_ICONS: Record<string, any> = {
  instant: Zap,
  custom_username: User,
  imei: Smartphone,
  manual: Clock,
};

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

  // Filter fields linked to the selected mode
  const activeFields = customFields.filter((f: any) => f.linked_mode === selectedMode);

  // If only one mode, don't show selector
  if (fulfillmentModes.length <= 1 && activeFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Mode selector - only show if multiple modes */}
      {fulfillmentModes.length > 1 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Account Type
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
                      {MODE_LABELS[mode] || mode}
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

      {/* Custom fields for selected mode */}
      {activeFields.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          {activeFields.map((field: any) => (
            <div key={field.id} className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                {field.field_name}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Input
                type={field.field_type === "email" ? "email" : field.field_type === "number" ? "number" : "text"}
                value={customFieldValues[field.field_name] || ""}
                onChange={(e) => onCustomFieldChange(field.field_name, e.target.value)}
                placeholder={`Enter ${field.field_name.toLowerCase()}`}
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
                  {field.min_length ? `Min: ${field.min_length} chars` : ""}
                  {field.min_length && field.max_length ? " · " : ""}
                  {field.max_length ? `Max: ${field.max_length} chars` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { MODE_LABELS, MODE_ICONS };
