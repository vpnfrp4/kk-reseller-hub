import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { t, useT, type BiLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LangContext";

interface ImportantNoticeModalProps {
  open: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

/** Small bilingual block: primary lang normal, secondary lang tiny */
function BiLine({ label }: { label: BiLabel }) {
  const { lang } = useLang();
  const secondary = label[lang === "mm" ? "en" : "mm"];
  return (
    <div>
      <span>{label[lang]}</span>
      <span className="block text-[10px] text-muted-foreground/50">{secondary}</span>
    </div>
  );
}

export default function ImportantNoticeModal({ open, onContinue, onCancel }: ImportantNoticeModalProps) {
  const l = useT();
  const { lang } = useLang();
  const [agreed, setAgreed] = useState(false);
  useEffect(() => { if (open) setAgreed(false); }, [open]);

  const notices: BiLabel[] = [
    t.notice.nonRefundable,
    t.notice.instantProcess,
    t.notice.ensureCorrect,
  ];

  const secondaryLang = lang === "mm" ? "en" : "mm";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className={cn("bg-card border-border/30 max-w-sm p-0 gap-0 overflow-hidden", "shadow-[0_25px_50px_-12px_hsl(var(--foreground)/0.12)]", "rounded-[20px]")}>
        <div className="p-6 space-y-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0" style={{ boxShadow: "0 0 20px hsl(var(--warning) / 0.1)" }}>
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{l(t.notice.title)}</h2>
              <p className="text-[10px] text-muted-foreground/60">{t.notice.title[secondaryLang]}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{l(t.notice.before)}</p>
            <ul className="space-y-2.5 pl-1">
              {notices.map((item, i) => (
                <li key={i} className={cn("flex items-start gap-2.5 text-sm text-foreground", "animate-fade-in")} style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-warning/60 mt-1.5 shrink-0" />
                  <BiLine label={item} />
                </li>
              ))}
            </ul>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none rounded-[var(--radius-card)] border border-border/40 bg-muted/20 p-3.5 transition-colors hover:bg-muted/30">
            <Checkbox checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} className="mt-0.5" />
            <div>
              <span className="text-sm text-foreground leading-snug">{l(t.notice.agreeLabel)}</span>
              <span className="block text-[10px] text-muted-foreground/50">{t.notice.agreeLabel[secondaryLang]}</span>
            </div>
          </label>

          <div className="flex flex-col gap-2.5">
            <Button disabled={!agreed} onClick={onContinue} className="w-full h-11 gap-2 btn-glow font-medium rounded-[var(--radius-btn)]">
              {l(t.notice.continueBtn)}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={onCancel} className="w-full h-10 btn-glass font-medium rounded-[var(--radius-btn)]">
              {l(t.notice.cancelBtn)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
