/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      navigator.serviceWorker.ready.then((reg: any) => {
        reg.pushManager?.getSubscription().then((sub: any) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;
    setLoading(true);

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return false;
      }

      // Get VAPID public key from edge function
      const { data, error } = await supabase.functions.invoke("push-subscribe", {
        body: { action: "get-vapid-key" },
      });

      if (error || !data?.publicKey) {
        throw new Error("Failed to get VAPID key");
      }

      // Subscribe to push
      const reg: any = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      // Save subscription to backend
      const { error: saveError } = await supabase.functions.invoke("push-subscribe", {
        body: {
          action: "subscribe",
          subscription: subscription.toJSON(),
        },
      });

      if (saveError) throw saveError;

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user || !isSupported) return;
    setLoading(true);

    try {
      const reg: any = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager?.getSubscription();

      if (subscription) {
        await supabase.functions.invoke("push-subscribe", {
          body: {
            action: "unsubscribe",
            endpoint: subscription.endpoint,
          },
        });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, isSupported]);

  return { isSubscribed, isSupported, permission, loading, subscribe, unsubscribe };
}
