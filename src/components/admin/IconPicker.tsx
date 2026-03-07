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
  { name: "vpn-outline", label: "Outline", category: "VPN", url: `${BUCKET_URL}/vpn-outline.png` },
  { name: "vpn-jumpjump", label: "JumpJump", category: "VPN", url: `${BUCKET_URL}/vpn-jumpjump.png` },
  { name: "vpn-letsvpn", label: "LetsVPN", category: "VPN", url: `${BUCKET_URL}/vpn-letsvpn.png` },
  { name: "vpn-lantern", label: "Lantern", category: "VPN", url: `${BUCKET_URL}/vpn-lantern.png` },
  { name: "vpn-psiphon", label: "Psiphon", category: "VPN", url: `${BUCKET_URL}/vpn-psiphon.png` },
  { name: "vpn-clash", label: "Clash", category: "VPN", url: `${BUCKET_URL}/vpn-clash.png` },
  { name: "vpn-hiddify", label: "Hiddify", category: "VPN", url: `${BUCKET_URL}/vpn-hiddify.png` },
  { name: "vpn-singbox", label: "Singbox", category: "VPN", url: `${BUCKET_URL}/vpn-singbox.png` },
  { name: "vpn-shadowrocket", label: "Shadowrocket", category: "VPN", url: `${BUCKET_URL}/vpn-shadowrocket.png` },
  { name: "vpn-streisand", label: "Streisand", category: "VPN", url: `${BUCKET_URL}/vpn-streisand.png` },
  { name: "vpn-nekoray", label: "NekoRay", category: "VPN", url: `${BUCKET_URL}/vpn-nekoray.png` },
  { name: "vpn-xray", label: "Xray", category: "VPN", url: `${BUCKET_URL}/vpn-xray.png` },
  { name: "vpn-trojan", label: "Trojan", category: "VPN", url: `${BUCKET_URL}/vpn-trojan.png` },
  { name: "vpn-brook", label: "Brook", category: "VPN", url: `${BUCKET_URL}/vpn-brook.png` },
  { name: "vpn-naiveproxy", label: "NaiveProxy", category: "VPN", url: `${BUCKET_URL}/vpn-naiveproxy.png` },
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
  { name: "apple-mdm-bypass", label: "MDM Bypass", category: "Apple", url: `${BUCKET_URL}/apple-mdm-bypass.png` },
  { name: "apple-activation-unlock", label: "Activation Unlock", category: "Apple", url: `${BUCKET_URL}/apple-activation-unlock.png` },
  { name: "apple-sn-check", label: "SN Check", category: "Apple", url: `${BUCKET_URL}/apple-sn-check.png` },
  { name: "apple-warranty", label: "Warranty", category: "Apple", url: `${BUCKET_URL}/apple-warranty.png` },
  { name: "apple-gsx", label: "GSX", category: "Apple", url: `${BUCKET_URL}/apple-gsx.png` },
  { name: "apple-carrier-unlock", label: "Carrier Unlock", category: "Apple", url: `${BUCKET_URL}/apple-carrier-unlock.png` },
  { name: "apple-network-check", label: "Network Check", category: "Apple", url: `${BUCKET_URL}/apple-network-check.png` },
  { name: "apple-blacklist-check", label: "Blacklist Check", category: "Apple", url: `${BUCKET_URL}/apple-blacklist-check.png` },
  // Android
  { name: "android-frp-unlock", label: "FRP Unlock", category: "Android", url: `${BUCKET_URL}/android-frp-unlock.png` },
  { name: "android-bootloader", label: "Bootloader", category: "Android", url: `${BUCKET_URL}/android-bootloader.png` },
  { name: "android-pattern-unlock", label: "Pattern Unlock", category: "Android", url: `${BUCKET_URL}/android-pattern-unlock.png` },
  { name: "android-pin-unlock", label: "PIN Unlock", category: "Android", url: `${BUCKET_URL}/android-pin-unlock.png` },
  { name: "android-factory-reset", label: "Factory Reset", category: "Android", url: `${BUCKET_URL}/android-factory-reset.png` },
  { name: "android-samsung", label: "Samsung", category: "Android", url: `${BUCKET_URL}/android-samsung.png` },
  { name: "android-xiaomi", label: "Xiaomi", category: "Android", url: `${BUCKET_URL}/android-xiaomi.png` },
  { name: "android-oppo", label: "Oppo", category: "Android", url: `${BUCKET_URL}/android-oppo.png` },
  { name: "android-vivo", label: "Vivo", category: "Android", url: `${BUCKET_URL}/android-vivo.png` },
  { name: "android-huawei", label: "Huawei", category: "Android", url: `${BUCKET_URL}/android-huawei.png` },
  { name: "android-realme", label: "Realme", category: "Android", url: `${BUCKET_URL}/android-realme.png` },
  { name: "android-oneplus", label: "OnePlus", category: "Android", url: `${BUCKET_URL}/android-oneplus.png` },
  { name: "android-nokia", label: "Nokia", category: "Android", url: `${BUCKET_URL}/android-nokia.png` },
  { name: "android-motorola", label: "Motorola", category: "Android", url: `${BUCKET_URL}/android-motorola.png` },
  { name: "android-pixel", label: "Google Pixel", category: "Android", url: `${BUCKET_URL}/android-pixel.png` },
  { name: "android-tecno", label: "Tecno", category: "Android", url: `${BUCKET_URL}/android-tecno.png` },
  { name: "android-infinix", label: "Infinix", category: "Android", url: `${BUCKET_URL}/android-infinix.png` },
  { name: "android-unlocktool", label: "UnlockTool", category: "Android", url: `${BUCKET_URL}/android-unlocktool.png` },
  { name: "android-honor", label: "Honor", category: "Android", url: `${BUCKET_URL}/android-honor.png` },
  { name: "android-lenovo", label: "Lenovo", category: "Android", url: `${BUCKET_URL}/android-lenovo.png` },
  { name: "android-sony", label: "Sony", category: "Android", url: `${BUCKET_URL}/android-sony.png` },
  { name: "android-lg", label: "LG", category: "Android", url: `${BUCKET_URL}/android-lg.png` },
  { name: "android-nothing", label: "Nothing", category: "Android", url: `${BUCKET_URL}/android-nothing.png` },
  { name: "android-poco", label: "POCO", category: "Android", url: `${BUCKET_URL}/android-poco.png` },
  { name: "android-redmi", label: "Redmi", category: "Android", url: `${BUCKET_URL}/android-redmi.png` },
  // GSM
  { name: "gsm-imei-check", label: "IMEI Check", category: "GSM", url: `${BUCKET_URL}/gsm-imei-check.png` },
  { name: "gsm-imei-repair", label: "IMEI Repair", category: "GSM", url: `${BUCKET_URL}/gsm-imei-repair.png` },
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
  { name: "digital-google", label: "Google", category: "Digital", url: `${BUCKET_URL}/digital-google.png` },
  { name: "digital-microsoft", label: "Microsoft", category: "Digital", url: `${BUCKET_URL}/digital-microsoft.png` },
  { name: "digital-windows", label: "Windows", category: "Digital", url: `${BUCKET_URL}/digital-windows.png` },
  { name: "digital-office", label: "Office", category: "Digital", url: `${BUCKET_URL}/digital-office.png` },
  { name: "digital-playstation", label: "PlayStation", category: "Digital", url: `${BUCKET_URL}/digital-playstation.png` },
  { name: "digital-discord", label: "Discord", category: "Digital", url: `${BUCKET_URL}/digital-discord.png` },
  { name: "digital-whatsapp", label: "WhatsApp", category: "Digital", url: `${BUCKET_URL}/digital-whatsapp.png` },
  { name: "digital-bitcoin", label: "Bitcoin", category: "Digital", url: `${BUCKET_URL}/digital-bitcoin.png` },
  { name: "digital-steam", label: "Steam", category: "Digital", url: `${BUCKET_URL}/digital-steam.png` },
  { name: "digital-amazon", label: "Amazon", category: "Digital", url: `${BUCKET_URL}/digital-amazon.png` },
  { name: "digital-paypal", label: "PayPal", category: "Digital", url: `${BUCKET_URL}/digital-paypal.png` },
  { name: "digital-stripe", label: "Stripe", category: "Digital", url: `${BUCKET_URL}/digital-stripe.png` },
  { name: "digital-ethereum", label: "Ethereum", category: "Digital", url: `${BUCKET_URL}/digital-ethereum.png` },
  { name: "digital-usdt", label: "USDT", category: "Digital", url: `${BUCKET_URL}/digital-usdt.png` },
  { name: "digital-binance", label: "Binance", category: "Digital", url: `${BUCKET_URL}/digital-binance.png` },
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
  { name: "system-flash-tool", label: "Flash Tool", category: "System", url: `${BUCKET_URL}/system-flash-tool.png` },
  { name: "system-notifications", label: "Notifications", category: "System", url: `${BUCKET_URL}/system-notifications.png` },
  { name: "system-statistics", label: "Statistics", category: "System", url: `${BUCKET_URL}/system-statistics.png` },
  { name: "system-support", label: "Support", category: "System", url: `${BUCKET_URL}/system-support.png` },
  { name: "system-topup", label: "Topup", category: "System", url: `${BUCKET_URL}/system-topup.png` },
  { name: "system-history", label: "History", category: "System", url: `${BUCKET_URL}/system-history.png` },
  // Tools
  { name: "tool-adb", label: "ADB Tool", category: "Tools", url: `${BUCKET_URL}/tool-adb.png` },
  { name: "tool-fastboot", label: "Fastboot Tool", category: "Tools", url: `${BUCKET_URL}/tool-fastboot.png` },
  { name: "tool-mtk", label: "MTK Tool", category: "Tools", url: `${BUCKET_URL}/tool-mtk.png` },
  { name: "tool-qualcomm", label: "Qualcomm Tool", category: "Tools", url: `${BUCKET_URL}/tool-qualcomm.png` },
  { name: "tool-edl", label: "EDL Mode", category: "Tools", url: `${BUCKET_URL}/tool-edl.png` },
  { name: "tool-diag", label: "Diag Mode", category: "Tools", url: `${BUCKET_URL}/tool-diag.png` },
  { name: "tool-usb-debug", label: "USB Debugging", category: "Tools", url: `${BUCKET_URL}/tool-usb-debug.png` },
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
