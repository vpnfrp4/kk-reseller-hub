import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ImageIcon, X } from "lucide-react";

const BUCKET_URL = `https://etickkjsiibsftjtbavy.supabase.co/storage/v1/object/public/product-images/icons`;

interface IconEntry { name: string; label: string; category: string; url: string }

const ICON_LIBRARY: IconEntry[] = [
  // VPN
  { name: "vpn-expressvpn", label: "ExpressVPN", category: "VPN", url: `${BUCKET_URL}/vpn-expressvpn.png` },
  { name: "vpn-nordvpn", label: "NordVPN", category: "VPN", url: `${BUCKET_URL}/vpn-nordvpn.png` },
  { name: "vpn-surfshark", label: "Surfshark", category: "VPN", url: `${BUCKET_URL}/vpn-surfshark.png` },
  { name: "vpn-protonvpn", label: "ProtonVPN", category: "VPN", url: `${BUCKET_URL}/vpn-protonvpn.png` },
  { name: "vpn-cyberghost", label: "CyberGhost", category: "VPN", url: `${BUCKET_URL}/vpn-cyberghost.png` },
  { name: "vpn-wireguard", label: "WireGuard", category: "VPN", url: `${BUCKET_URL}/vpn-wireguard.png` },
  { name: "vpn-openvpn", label: "OpenVPN", category: "VPN", url: `${BUCKET_URL}/vpn-openvpn.png` },
  { name: "vpn-v2ray", label: "V2Ray", category: "VPN", url: `${BUCKET_URL}/vpn-v2ray.png` },
  { name: "vpn-shadowsocks", label: "Shadowsocks", category: "VPN", url: `${BUCKET_URL}/vpn-shadowsocks.png` },
  // Apple
  { name: "apple-iphone", label: "iPhone", category: "Apple", url: `${BUCKET_URL}/apple-iphone.png` },
  { name: "apple-ipad", label: "iPad", category: "Apple", url: `${BUCKET_URL}/apple-ipad.png` },
  { name: "apple-macbook", label: "MacBook", category: "Apple", url: `${BUCKET_URL}/apple-macbook.png` },
  { name: "apple-watch", label: "Apple Watch", category: "Apple", url: `${BUCKET_URL}/apple-watch.png` },
  { name: "apple-airpods", label: "AirPods", category: "Apple", url: `${BUCKET_URL}/apple-airpods.png` },
  { name: "apple-id", label: "Apple ID", category: "Apple", url: `${BUCKET_URL}/apple-id.png` },
  { name: "apple-icloud", label: "iCloud", category: "Apple", url: `${BUCKET_URL}/apple-icloud.png` },
  { name: "apple-fmi-off", label: "FMI Off", category: "Apple", url: `${BUCKET_URL}/apple-fmi-off.png` },
  { name: "apple-passcode-unlock", label: "Passcode Unlock", category: "Apple", url: `${BUCKET_URL}/apple-passcode-unlock.png` },
  // Android
  { name: "android-frp-unlock", label: "FRP Unlock", category: "Android", url: `${BUCKET_URL}/android-frp-unlock.png` },
  { name: "android-bootloader", label: "Bootloader", category: "Android", url: `${BUCKET_URL}/android-bootloader.png` },
  { name: "android-pattern-unlock", label: "Pattern Unlock", category: "Android", url: `${BUCKET_URL}/android-pattern-unlock.png` },
  { name: "android-samsung", label: "Samsung", category: "Android", url: `${BUCKET_URL}/android-samsung.png` },
  { name: "android-xiaomi", label: "Xiaomi", category: "Android", url: `${BUCKET_URL}/android-xiaomi.png` },
  { name: "android-oppo", label: "Oppo", category: "Android", url: `${BUCKET_URL}/android-oppo.png` },
  { name: "android-vivo", label: "Vivo", category: "Android", url: `${BUCKET_URL}/android-vivo.png` },
  { name: "android-unlocktool", label: "UnlockTool", category: "Android", url: `${BUCKET_URL}/android-unlocktool.png` },
  // GSM
  { name: "gsm-imei-check", label: "IMEI Check", category: "GSM", url: `${BUCKET_URL}/gsm-imei-check.png` },
  { name: "gsm-network-unlock", label: "Network Unlock", category: "GSM", url: `${BUCKET_URL}/gsm-network-unlock.png` },
  { name: "gsm-carrier-unlock", label: "Carrier Unlock", category: "GSM", url: `${BUCKET_URL}/gsm-carrier-unlock.png` },
  { name: "gsm-baseband-repair", label: "Baseband Repair", category: "GSM", url: `${BUCKET_URL}/gsm-baseband-repair.png` },
  // Digital
  { name: "digital-netflix", label: "Netflix", category: "Digital", url: `${BUCKET_URL}/digital-netflix.png` },
  { name: "digital-spotify", label: "Spotify", category: "Digital", url: `${BUCKET_URL}/digital-spotify.png` },
  { name: "digital-youtube", label: "YouTube", category: "Digital", url: `${BUCKET_URL}/digital-youtube.png` },
  { name: "digital-telegram", label: "Telegram", category: "Digital", url: `${BUCKET_URL}/digital-telegram.png` },
  { name: "digital-tiktok", label: "TikTok", category: "Digital", url: `${BUCKET_URL}/digital-tiktok.png` },
  { name: "digital-facebook", label: "Facebook", category: "Digital", url: `${BUCKET_URL}/digital-facebook.png` },
  { name: "digital-instagram", label: "Instagram", category: "Digital", url: `${BUCKET_URL}/digital-instagram.png` },
  { name: "digital-chatgpt", label: "ChatGPT", category: "Digital", url: `${BUCKET_URL}/digital-chatgpt.png` },
  { name: "digital-canva", label: "Canva", category: "Digital", url: `${BUCKET_URL}/digital-canva.png` },
  { name: "digital-capcut", label: "CapCut", category: "Digital", url: `${BUCKET_URL}/digital-capcut.png` },
  { name: "digital-zoom", label: "Zoom", category: "Digital", url: `${BUCKET_URL}/digital-zoom.png` },
  { name: "digital-gaming", label: "Gaming", category: "Digital", url: `${BUCKET_URL}/digital-gaming.png` },
  { name: "digital-giftcard", label: "Gift Card", category: "Digital", url: `${BUCKET_URL}/digital-giftcard.png` },
  // System
  { name: "system-dashboard", label: "Dashboard", category: "System", url: `${BUCKET_URL}/system-dashboard.png` },
  { name: "system-orders", label: "Orders", category: "System", url: `${BUCKET_URL}/system-orders.png` },
  { name: "system-products", label: "Products", category: "System", url: `${BUCKET_URL}/system-products.png` },
  { name: "system-wallet", label: "Wallet", category: "System", url: `${BUCKET_URL}/system-wallet.png` },
  { name: "system-users", label: "Users", category: "System", url: `${BUCKET_URL}/system-users.png` },
  { name: "system-api", label: "API", category: "System", url: `${BUCKET_URL}/system-api.png` },
  { name: "system-settings", label: "Settings", category: "System", url: `${BUCKET_URL}/system-settings.png` },
  { name: "system-server", label: "Server", category: "System", url: `${BUCKET_URL}/system-server.png` },
  { name: "system-database", label: "Database", category: "System", url: `${BUCKET_URL}/system-database.png` },
  { name: "system-repair-tools", label: "Repair Tools", category: "System", url: `${BUCKET_URL}/system-repair-tools.png` },
];

const CATEGORIES = [...new Set(ICON_LIBRARY.map((i) => i.category))];

interface IconPickerProps {
  value: string;
  onChange: (url: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let items = ICON_LIBRARY;
    if (activeCategory) items = items.filter((i) => i.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.label.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return items;
  }, [search, activeCategory]);

  const selectedIcon = ICON_LIBRARY.find((i) => value?.includes(i.name));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs px-2.5">
          <ImageIcon className="w-3.5 h-3.5" />
          {selectedIcon ? "Change Icon" : "Pick Icon"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Choose a 3D Icon</DialogTitle>
        </DialogHeader>

        {/* Search + category filter */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                !activeCategory ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                  activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Icon grid */}
        <div className="flex-1 overflow-y-auto min-h-0 mt-2">
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
            {filtered.map((icon) => {
              const isSelected = value?.includes(icon.name);
              return (
                <button
                  key={icon.name}
                  type="button"
                  onClick={() => {
                    onChange(icon.url);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all hover:scale-105",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-transparent hover:border-border hover:bg-muted/40"
                  )}
                >
                  <img
                    src={icon.url}
                    alt={icon.label}
                    className="w-12 h-12 object-contain rounded-lg"
                    loading="lazy"
                  />
                  <span className="text-[9px] text-muted-foreground leading-tight text-center truncate w-full">
                    {icon.label}
                  </span>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs">No icons found</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
