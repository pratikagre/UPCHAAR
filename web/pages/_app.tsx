import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import NavBar from "@/components/NavBar";
import { Toaster, toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Analytics } from "@vercel/analytics/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient();

const shownNotifications = new Set<string>();
let browserNotifier:
  | ((r: { title: string; body: string; type?: string }) => void)
  | null = null;

let notifierInitPromise: Promise<
  ((r: { title: string; body: string; type?: string }) => Promise<void>) | null
> | null = null;

let notifiedPermissionDenied = false;

const initBrowserNotifier = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }
  try {
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (err) {
        console.error("Service worker registration failed:", err);
      }
    }

    const registration =
      "serviceWorker" in navigator
        ? await navigator.serviceWorker.ready.catch((err) => {
            console.error("Service worker ready failed:", err);
            return null;
          })
        : null;

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    const notify = async ({ title, body }: { title: string; body: string }) => {
      if (!("Notification" in window)) return;
      if (Notification.permission === "denied") {
        if (!notifiedPermissionDenied) {
          toast.warning(
            "Browser notifications are blocked. Enable them in site settings.",
          );
          notifiedPermissionDenied = true;
        }
        return;
      }

      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
      }

      const reg =
        registration ||
        (await navigator.serviceWorker.getRegistration().catch((err) => {
          console.error("getRegistration failed:", err);
          return null;
        }));

      const options: NotificationOptions = {
        body,
        icon: "/favicon.ico",
        tag: `${title}:${body}`,
        data: { url: window.location.href },
      };

      if (reg) {
        await reg.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
    };

    browserNotifier = notify;
    return notify;
  } catch (err) {
    console.error("Notification init failed:", err);
    return null;
  }
};

const ensureNotifier = async () => {
  if (browserNotifier) return browserNotifier;
  if (!notifierInitPromise) {
    notifierInitPromise = initBrowserNotifier();
  }
  return notifierInitPromise;
};

const handleToast = (r: { title: string; body: string }) => {
  const key = `${r.title}:${r.body}`;
  if (shownNotifications.has(key)) return;
  shownNotifications.add(key);

  toast.info(r.title, { description: r.body });

  if (browserNotifier) {
    browserNotifier(r);
  } else {
    ensureNotifier().then((notifier) => notifier?.(r));
  }
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Hide nav bar on auth pages and landing page and 404
  const authPaths = [
    "/",
    "/auth/signUp",
    "/auth/login",
    "/404",
    "/auth/forgotPassword",
    "/auth/updatePassword",
  ];
  const hideNav = authPaths.includes(router.pathname);

  const [navExpanded, setNavExpanded] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const marginLeft = isMobile ? "0" : navExpanded ? "16rem" : "5rem";

  const [userId, setUserId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const broadcastChannelRef = useRef<any>(null);

  // ✅ Responsive
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkScreen = () => setIsMobile(window.innerWidth < 768);
      checkScreen();
      window.addEventListener("resize", checkScreen);
      return () => window.removeEventListener("resize", checkScreen);
    }
  }, []);

  useEffect(() => {
    const storedPref = localStorage.getItem("navExpanded");
    if (storedPref !== null) setNavExpanded(storedPref === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("navExpanded", String(navExpanded));
  }, [navExpanded]);

  // ✅ Register service worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (err) {
        console.error("Service worker registration failed:", err);
      }
    };
    register();
  }, []);

  // ✅ Init browser notifications
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    let cancelled = false;

    const ensurePermission = async () => {
      try {
        const current = Notification.permission;
        if (current === "default") {
          await Notification.requestPermission();
        }
      } catch (err) {
        console.error("Notification permission error:", err);
      }
    };

    const notifyBrowser = async ({
      title,
      body,
    }: {
      title: string;
      body: string;
    }) => {
      try {
        if (!("Notification" in window)) return;
        if (Notification.permission === "denied") return;

        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") return;
        }

        const registration = await navigator.serviceWorker.getRegistration();
        const options: NotificationOptions = {
          body,
          icon: "/favicon.ico",
          tag: `${title}:${body}`,
          data: { url: window.location.href },
        };

        if (registration) {
          await registration.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      } catch (err) {
        console.error("Failed to show browser notification:", err);
      }
    };

    ensurePermission();
    browserNotifier = notifyBrowser;

    return () => {
      if (!cancelled) {
        browserNotifier = null;
        cancelled = true;
      }
    };
  }, []);

  // ✅ Important: Move supabase auth listener INSIDE useEffect (no build crash)
  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id;
      if (!uid) return;

      supabase.removeAllChannels();

      const fetchMissed = async () => {
        const since = new Date(Date.now() - 60_000).toISOString();
        const { data, error } = await supabase
          .from("user_notifications")
          .select("title, body")
          .eq("user_profile_id", uid)
          .gte("created_at", since);

        if (error) {
          console.error("Missed fetch error:", error);
          return;
        }

        (data ?? []).forEach(handleToast);
      };

      const channel = supabase
        .channel(`reminders-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_profile_id=eq.${uid}`,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ new: row }: any) => handleToast(row),
        );

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ reminders channel LIVE");
          fetchMissed();
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ✅ Get logged-in user id
  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isMounted) {
        setUserId(user.id);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ Realtime reminders channel (guarded)
  useLayoutEffect(() => {
    if (!supabase) return;
    if (!userId) return;

    const fetchMissed = async () => {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { data, error } = await supabase
        .from("user_notifications")
        .select("title, body")
        .eq("user_profile_id", userId)
        .gte("created_at", since);

      if (error) {
        console.error("Missed fetch error:", error);
        return;
      }

      (data ?? []).forEach(handleToast);
    };

    const channel = supabase
      .channel(`reminders-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_profile_id=eq.${userId}`,
        },
        ({ new: row }) => handleToast(row as { title: string; body: string }),
      );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        fetchMissed();
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ✅ Reminder notifications subscription (guarded)
  useEffect(() => {
    if (!supabase) return;
    if (!userId) return;

    const channel = supabase
      .channel(`reminders-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_profile_id=eq.${userId}`,
        },
        (payload) => {
          const { title, body } = payload.new as {
            title: string;
            body: string;
          };
          handleToast({ title, body });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ✅ Broadcast channel (guarded)
  useEffect(() => {
    if (!supabase) return;

    broadcastChannelRef.current = supabase.channel("universal-channel", {
      config: { broadcast: { self: false } },
    });

    const channel = broadcastChannelRef.current;

    channel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("broadcast", { event: "*" }, (payload: any) => {
        if (payload?.payload?.message) {
          toast.success(`Notification: ${payload.payload.message}`);
        }
      })
      .subscribe((status: string) => {
        console.log("Universal channel status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, []);

  // ✅ Fetch due reminders (guarded)
  useEffect(() => {
    if (!supabase) return;
    if (!userId) return;

    const fetchDueReminders = async () => {
      const now = new Date();
      const windowStart = new Date(now.setSeconds(0, 0));
      const windowEnd = new Date(windowStart.getTime() + 60_000);

      const { data: dueReminders, error } = await supabase
        .from("user_notifications")
        .select("title, body")
        .eq("user_profile_id", userId)
        .gte("created_at", windowStart.toISOString())
        .lt("created_at", windowEnd.toISOString());

      if (error) {
        console.error("Error fetching due reminders:", error);
        return;
      }

      dueReminders?.forEach(({ title, body }) => handleToast({ title, body }));
    };

    const now = new Date();
    const msToNextMinute =
      60_000 - (now.getSeconds() * 1_000 + now.getMilliseconds());

    const timeoutId = setTimeout(() => {
      fetchDueReminders();
      const intervalId = setInterval(fetchDueReminders, 60_000);

      return () => clearInterval(intervalId);
    }, msToNextMinute);

    fetchDueReminders();

    return () => clearTimeout(timeoutId);
  }, [userId]);

  if (hideNav) {
    return (
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
        <Toaster position="bottom-right" richColors />
        <Analytics />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div>
          <NavBar
            isExpanded={navExpanded}
            setIsExpanded={setNavExpanded}
            staticNav={false}
          />
          <main className="transition-all duration-300" style={{ marginLeft }}>
            <Component {...pageProps} />
          </main>
          <Toaster position="bottom-right" richColors />
          <Analytics />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
