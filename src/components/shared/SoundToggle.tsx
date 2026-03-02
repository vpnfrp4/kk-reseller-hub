import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from "@/lib/notification-sound";
import { cn } from "@/lib/utils";

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) playNotificationSound();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 relative transition-colors",
            enabled
              ? "text-primary hover:text-primary/80"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={toggle}
        >
          {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          {enabled && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            enabled ? "bg-primary" : "bg-muted-foreground/50"
          )}
        />
        {enabled ? "Sound on" : "Sound off"}
      </TooltipContent>
    </Tooltip>
  );
}