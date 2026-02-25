import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle2, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-border/50">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">App Installed</h1>
            <p className="text-muted-foreground text-sm">
              KKTech is installed on your device. You can open it from your home screen.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-border/50">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Install KKTech</h1>
            <p className="text-muted-foreground text-sm">
              Install the app for faster access, offline support, and real-time notifications.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Download className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Instant Access</p>
                <p className="text-xs text-muted-foreground">Launch directly from your home screen</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Get alerts for orders, top-ups and low balance</p>
              </div>
            </div>
          </div>

          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="w-4 h-4 mr-2" />
              Install App
            </Button>
          ) : isIOS ? (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <p className="text-sm font-semibold text-foreground text-center">Install on iOS</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                Tap the <Share className="w-4 h-4 inline text-primary" /> Share button in Safari
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                Scroll down and tap "Add to Home Screen"
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">3</span>
                Tap "Add" to confirm
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <p className="text-sm font-semibold text-foreground text-center">Install on Android</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                Tap the <MoreVertical className="w-4 h-4 inline text-primary" /> menu in Chrome
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                Tap "Install app" or "Add to Home Screen"
              </div>
            </div>
          )}

          <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-muted-foreground">
            Maybe later
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
