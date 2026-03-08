import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const OWNER_NAME_FALLBACK = "KK Tech";
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
}

function sanitizeName(value: string) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 24);
}

function getLeadingNumber(code: string): number | null {
  const match = code.match(/^\d{1,2}/);
  return match ? Number(match[0]) : null;
}

function getParityLabel(value: number) {
  return value % 2 === 0 ? "စုံ" : "မ";
}

function isValidCode(code: string) {
  return /^[0-9]{1,2}[A-Z0-9]$/.test(code);
}

function monthCells(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= totalDays; day++) cells.push(day);
  return cells;
}

export default function CarCodeCheckerPage() {
  const [searchParams] = useSearchParams();
  const today = useMemo(() => new Date(), []);

  const queryName = searchParams.get("name");
  const initialName = queryName ? sanitizeName(queryName).trim() || OWNER_NAME_FALLBACK : OWNER_NAME_FALLBACK;

  const [ownerName, setOwnerName] = useState(initialName);
  const [codeInput, setCodeInput] = useState("");
  const [checkedCode, setCheckedCode] = useState("");
  const [leadingNumber, setLeadingNumber] = useState<number | null>(null);
  const [isPassToday, setIsPassToday] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  const displayName = ownerName.trim() || OWNER_NAME_FALLBACK;
  const dayOfMonth = today.getDate();

  const todayLabel = useMemo(() => {
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(today);
    return `${day}-${month}-${year} (${weekday})`;
  }, [today]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(today),
    [today]
  );

  const calendar = useMemo(() => monthCells(today), [today]);

  useEffect(() => {
    document.title = `Check Code | ${displayName}`;
  }, [displayName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeCode(codeInput);
    if (!isValidCode(code)) {
      setError("Code format မှန်အောင် 1-2 digit + 1 letter/number ထည့်ပါ။ ဥပမာ 2A, 1T, 38W");
      setCheckedCode(""); setLeadingNumber(null); setIsPassToday(null);
      return;
    }
    const number = getLeadingNumber(code);
    if (number === null) {
      setError("Code ထဲမှာ ရှေ့နံပါတ် မတွေ့ပါ။");
      setCheckedCode(""); setLeadingNumber(null); setIsPassToday(null);
      return;
    }
    const pass = number % 2 === dayOfMonth % 2;
    setCodeInput(code); setCheckedCode(code); setLeadingNumber(number); setIsPassToday(pass); setError("");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">{displayName} Drive Check</h1>
        <p className="mt-1 text-sm text-muted-foreground">ယာဉ်နံပါတ် စစ်ဆေးခြင်း</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* ── Left: Checker ── */}
        <Card className="p-5 sm:p-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Car className="w-3.5 h-3.5" />
              {displayName} - Car Code Checker
            </span>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Name
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(sanitizeName(e.target.value))}
                placeholder={OWNER_NAME_FALLBACK}
                className="w-36 h-8 text-xs"
              />
            </label>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
            <CalendarDays className="w-4 h-4" />
            ယနေ့ - {todayLabel}
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            ယာဉ်နံပါတ် ရှေ့စာလုံးထည့်ပြီး စစ်ကြည့်ပါ။ ဥပမာ -
            {["2A", "1T", "38W"].map((ex) => (
              <span key={ex} className="ml-2 rounded-md bg-secondary px-2 py-0.5 font-semibold text-foreground text-xs">{ex}</span>
            ))}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Enter Car Code
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="text"
                inputMode="text"
                required
                pattern="[0-9]{1,2}[A-Za-z0-9]"
                maxLength={3}
                autoComplete="off"
                placeholder="2A"
                value={codeInput}
                onChange={(e) => setCodeInput(normalizeCode(e.target.value))}
                className="h-14 text-2xl font-bold uppercase tracking-[0.24em] text-center sm:text-left"
              />
              <Button type="submit" size="lg" className="h-14 px-8 text-sm font-bold uppercase tracking-[0.12em]">
                Check
              </Button>
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
                {error}
              </div>
            )}

            {checkedCode && leadingNumber !== null && isPassToday !== null && (
              <div className={cn(
                "rounded-2xl border p-4",
                isPassToday ? "border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/50" : "border-rose-300/50 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800/50"
              )}>
                <div className="flex items-center gap-2">
                  {isPassToday
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    : <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-[0.14em]",
                    isPassToday ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                  )}>
                    {isPassToday ? "PASS" : "FAIL"}
                  </p>
                </div>
                <p className={cn(
                  "mt-2 text-base font-bold",
                  isPassToday ? "text-emerald-900 dark:text-emerald-100" : "text-rose-900 dark:text-rose-100"
                )}>
                  {isPassToday ? "သင့်ကား ယနေ့အပြင်ထွက်လို့ရပါသည်။" : "သင့်ကား ယနေ့အပြင်ထွက်လို့မရသေးပါ။"}
                </p>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>ယာဉ်နံပါတ် <span className="font-bold text-foreground">{checkedCode}</span> ({leadingNumber}) = <span className="font-bold">{getParityLabel(leadingNumber)}</span></p>
                  <p>ယနေ့ {dayOfMonth} ရက်နေ့ = <span className="font-bold">{getParityLabel(dayOfMonth)}</span></p>
                </div>
              </div>
            )}
          </form>
        </Card>

        {/* ── Right: Calendar ── */}
        <Card className="p-5 sm:p-8 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {monthLabel}
            </h2>
            {checkedCode ? (
              <p className="mt-1 text-sm text-muted-foreground">
                ယာဉ်နံပါတ် <span className="font-bold text-foreground">{checkedCode}</span> အတွက်
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Code ထည့်ပြီး စစ်ကြည့်ပါ</p>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
            {WEEKDAY_LABELS.map((w) => <span key={w}>{w}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {calendar.map((day, i) => {
              if (day === null) return <span key={`e-${i}`} className="p-1.5" />;
              const isToday = day === dayOfMonth;
              let color = "bg-secondary/60 text-muted-foreground border-border";
              if (leadingNumber !== null) {
                color = day % 2 === leadingNumber % 2
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800";
              }
              return (
                <span
                  key={day}
                  className={cn(
                    "rounded-lg border p-1.5 text-xs transition-all",
                    color,
                    isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background font-bold"
                  )}
                >
                  {day}
                </span>
              );
            })}
          </div>

          {leadingNumber !== null && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-emerald-200 bg-emerald-100 dark:bg-emerald-900/40 dark:border-emerald-800" /> ရ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-rose-200 bg-rose-100 dark:bg-rose-900/40 dark:border-rose-800" /> မရ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded ring-2 ring-primary" /> ယနေ့
              </span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
