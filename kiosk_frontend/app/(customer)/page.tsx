"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ProductCard } from "@/components/customer/ProductCard";
import { CartView } from "@/components/customer/CartView";
import { CategoryFilter } from "@/components/customer/CategoryFilter";
import { PaymentModal } from "@/components/customer/PaymentModal";
import { KioskAttractScreen } from "@/components/customer/KioskAttractScreen";
import { productsApi } from "@/lib/api/products";
import { ordersApi } from "@/lib/api/orders";
import { paymentApi } from "@/lib/api/payment";
import {
  settingsApi,
  resolveCopyright,
  resolveSiteName,
  resolveSiteDescription,
  resolveServiceFeeAmount,
  resolveServiceTitle,
  resolvePackagingFeeAmount,
  resolvePackagingTitle,
  mergeSettings,
  isCouponsEnabled,
  type Settings,
} from "@/lib/api/settings";
import { useCartStore } from "@/lib/store/cart-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { analyticsApi } from "@/lib/api/dashboard";
import {
  resolvePaymentFailureKind,
  shouldKeepCartOnPaymentFailure,
  extractPaymentErrorPayload,
  type PaymentFailureKind,
} from "@/lib/payment-failure";
import { formatNumber, cn } from "@/lib/utils";
import {
  readCachedSettings,
  writeCachedSettings,
  readCachedCategories,
  writeCachedCategories,
  readCachedProducts,
  writeCachedProducts,
  clearCachedMenu,
  preloadImage,
  preloadImages,
  migrateSettingsCache,
  getSettingsUpdatedEventName,
  type KioskSettingsSnapshot,
} from "@/lib/kiosk-persist";
import { withMediaCacheBust } from "@/lib/media-url";
import { useDragScroll } from "@/lib/use-drag-scroll";
import {
  CustomerMenuSkeleton,
  CategoryFilterSkeleton,
  ProductGridSkeleton,
} from "@/components/customer/CustomerMenuSkeleton";

/** Return to attract screen after this much idle time on the menu */
const KIOSK_IDLE_MS = 90_000;
/** Must stay above backend POS DLL timeout (desktop default 60s). */
const PAYMENT_DEVICE_IDLE_MS = 70_000;
/** Watch cancelled/timed-out orders in case POS later returns success. */
const LATE_POS_WATCH_MS = 90_000;
/** Menu refreshes on mount; catalog_revision still invalidates after admin edits. */
const MENU_STALE_MS = 15_000;
const MENU_GC_MS = 24 * 60 * 60 * 1000;

export default function CustomerPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showAttract, setShowAttract] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "waiting" | "success" | "failed" | "cancelled"
  >("waiting");
  const [paymentFailureKind, setPaymentFailureKind] =
    useState<PaymentFailureKind | null>(null);
  const paymentFailureKindRef = useRef<PaymentFailureKind | null>(null);
  const [currentOrder, setCurrentOrder] = useState<{
    id: number;
    orderNumber: string;
    totalAmount?: number;
  } | null>(null);
  const [pendingFulfillment, setPendingFulfillment] = useState<
    "dine_in" | "takeaway" | null
  >(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cartClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paymentModalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paymentWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paymentAbortRef = useRef<AbortController | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lateWatchRef = useRef<NodeJS.Timeout | null>(null);
  const lateSettledRef = useRef(false);
  const lastCatalogRevisionRef = useRef<number | null>(null);
  const landingThemeRef = useRef("cinema");
  const productsScrollRef = useDragScroll<HTMLElement>("y");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getTotalItems, items, getTotalPrice, clearCart, couponCode } = useCartStore();

  const updatePaymentFailureKind = (kind: PaymentFailureKind | null) => {
    paymentFailureKindRef.current = kind;
    setPaymentFailureKind(kind);
  };

  useEffect(() => {
    setIsMounted(true);
    // Drop legacy A/B sticky pick if present
    try {
      sessionStorage.removeItem("kiosk-landing-ab-theme");
    } catch {
      /* ignore */
    }
    
    // همیشه token های authentication را پاک کن برای امنیت
    // صفحه مشتری نباید نیاز به authentication داشته باشد
    const clearAuthTokens = () => {
      if (typeof window === "undefined") return;

      // پاک کردن auth-storage از localStorage
      localStorage.removeItem("auth-storage");
      
      // همچنین از store هم پاک کن
      const { logout } = useAuthStore.getState();
      logout();
    };

    clearAuthTokens();

    // Clear other localStorage when coming from admin panel or direct access
    // This ensures user needs to login again when accessing admin
    const clearStorage = () => {
      if (typeof window === "undefined") return;
      
      const referrer = document.referrer;
      const currentOrigin = window.location.origin;
      
      // Check if we're coming from admin (check referrer or sessionStorage flag)
      const isFromAdmin = 
        (referrer && referrer.includes("/admin")) ||
        sessionStorage.getItem("from-admin") === "true";
      
      // Check if user came directly (no referrer or referrer is from different origin)
      // This means user typed URL directly or came from external site
      const isDirectAccess =
        !referrer ||
        referrer === "" ||
        !referrer.startsWith(currentOrigin) ||
        referrer === window.location.href;
      
      // Clear other localStorage if coming from admin OR direct access
      if (isFromAdmin || isDirectAccess) {
        // Clear other Zustand persisted stores (but not auth-storage, already cleared)
        localStorage.removeItem("cart-storage");
        localStorage.removeItem("theme-storage");
        
        // Clear sessionStorage flag
        sessionStorage.removeItem("from-admin");
      }
    };
    
    clearStorage();
  }, []);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (cartClearTimeoutRef.current) {
        clearTimeout(cartClearTimeoutRef.current);
      }
      if (paymentModalTimeoutRef.current) {
        clearTimeout(paymentModalTimeoutRef.current);
      }
      if (paymentWaitTimeoutRef.current) {
        clearTimeout(paymentWaitTimeoutRef.current);
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (lateWatchRef.current) {
        clearInterval(lateWatchRef.current);
      }
      paymentAbortRef.current?.abort();
    };
  }, []);

  const clearPaymentTimers = () => {
    if (paymentModalTimeoutRef.current) {
      clearTimeout(paymentModalTimeoutRef.current);
      paymentModalTimeoutRef.current = null;
    }
    if (paymentWaitTimeoutRef.current) {
      clearTimeout(paymentWaitTimeoutRef.current);
      paymentWaitTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const abortPosWait = () => {
    void paymentApi.abortPos();
  };

  const abortPaymentRequest = () => {
    paymentAbortRef.current?.abort();
    paymentAbortRef.current = null;
    abortPosWait();
  };

  const stopLatePosWatch = () => {
    if (lateWatchRef.current) {
      clearInterval(lateWatchRef.current);
      lateWatchRef.current = null;
    }
  };

  const applyLatePosPaid = (order: {
    id: number;
    order_number?: string;
  }) => {
    if (lateSettledRef.current) return;
    lateSettledRef.current = true;
    stopLatePosWatch();
    abortPosWait();
    setCurrentOrder({
      id: order.id,
      orderNumber: order.order_number || `#${order.id}`,
    });
    updatePaymentFailureKind(null);
    setPaymentStatus("success");
    setIsPaymentModalOpen(true);
    clearCart();
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const startLatePosWatch = (orderId: number) => {
    if (!orderId || lateSettledRef.current) return;
    stopLatePosWatch();
    const startedAt = Date.now();
    const tick = async () => {
      if (lateSettledRef.current) {
        stopLatePosWatch();
        return;
      }
      if (Date.now() - startedAt > LATE_POS_WATCH_MS) {
        stopLatePosWatch();
        return;
      }
      try {
        const data = await ordersApi.getOrderPaymentStatus(orderId);
        const paid =
          data.result?.payment_status === "paid" ||
          data.result?.status === "paid";
        if (paid && data.result) {
          applyLatePosPaid(data.result);
        }
      } catch {
        // Keep watching — backend may still be recording the late POS success.
      }
    };
    lateWatchRef.current = setInterval(() => {
      void tick();
    }, 2500);
    void tick();
  };

  const finishPaymentFlow = (kind: PaymentFailureKind | null) => {
    if (kind && shouldKeepCartOnPaymentFailure(kind)) {
      returnToMenuKeepingCart();
      return;
    }
    goToAttract();
  };

  /** Full session reset → attract (clears cart). Use after success or idle. */
  const goToAttract = () => {
    stopLatePosWatch();
    clearPaymentTimers();
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    setIsPaymentModalOpen(false);
    setCurrentOrder(null);
    setPaymentStatus("waiting");
    updatePaymentFailureKind(null);
    setPendingFulfillment(null);
    setSelectedCategory(null);
    clearCart();
    setShowAttract(true);
  };
  const returnToMenuKeepingCart = () => {
    clearPaymentTimers();
    setIsPaymentModalOpen(false);
    setCurrentOrder(null);
    setPaymentStatus("waiting");
    updatePaymentFailureKind(null);
    // keep pendingFulfillment / cart items for retry
  };

  const startOrdering = () => {
    clearCart();
    setSelectedCategory(null);
    setPendingFulfillment(null);
    setShowAttract(false);
    void analyticsApi.trackLanding({
      event_type: "start",
      theme: landingThemeRef.current,
    });
  };

  // Auto-close payment modal: success → attract; soft failures (incl. timeout) → keep cart
  useEffect(() => {
    if (
      (paymentStatus === "success" ||
        paymentStatus === "failed" ||
        paymentStatus === "cancelled") &&
      isPaymentModalOpen
    ) {
      if (paymentModalTimeoutRef.current) {
        clearTimeout(paymentModalTimeoutRef.current);
        paymentModalTimeoutRef.current = null;
      }

      paymentModalTimeoutRef.current = setTimeout(() => {
        setIsPaymentModalOpen((prevIsOpen) => {
          if (prevIsOpen) {
            if (paymentStatus === "success") {
              goToAttract();
            } else {
              // Use ref — timeout closure can lag behind the latest kind.
              finishPaymentFlow(paymentFailureKindRef.current);
            }
            return false;
          }
          return prevIsOpen;
        });
        paymentModalTimeoutRef.current = null;
      }, 5000);

      return () => {
        if (paymentModalTimeoutRef.current) {
          clearTimeout(paymentModalTimeoutRef.current);
          paymentModalTimeoutRef.current = null;
        }
      };
    } else {
      if (paymentStatus !== "waiting" && paymentModalTimeoutRef.current) {
        clearTimeout(paymentModalTimeoutRef.current);
        paymentModalTimeoutRef.current = null;
      }
    }
  }, [paymentStatus, isPaymentModalOpen, paymentFailureKind]);

  // No POS interaction for a while → fail and clear cart (modal auto-close handles reset)
  useEffect(() => {
    if (!isPaymentModalOpen || paymentStatus !== "waiting") {
      if (paymentWaitTimeoutRef.current) {
        clearTimeout(paymentWaitTimeoutRef.current);
        paymentWaitTimeoutRef.current = null;
      }
      return;
    }

    paymentWaitTimeoutRef.current = setTimeout(() => {
      abortPosWait();
      updatePaymentFailureKind("timeout");
      setPaymentStatus("failed");
      paymentWaitTimeoutRef.current = null;
    }, PAYMENT_DEVICE_IDLE_MS);

    return () => {
      if (paymentWaitTimeoutRef.current) {
        clearTimeout(paymentWaitTimeoutRef.current);
        paymentWaitTimeoutRef.current = null;
      }
    };
  }, [isPaymentModalOpen, paymentStatus]);

  // Idle → attract screen (skip while attract/payment open)
  useEffect(() => {
    if (showAttract || isPaymentModalOpen) {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
      return;
    }

    const bump = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        goToAttract();
      }, KIOSK_IDLE_MS);
    };

    bump();
    const opts: AddEventListenerOptions = { passive: true };
    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "touchstart",
      "keydown",
      "scroll",
      "mousemove",
    ];
    events.forEach((ev) => window.addEventListener(ev, bump, opts));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bump));
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    };
  }, [showAttract, isPaymentModalOpen, items.length]);

  const handleLogoClick = () => {
    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    // If clicked 5 times, redirect to admin
    if (newCount >= 5) {
      // Clear the from-admin flag since we're going TO admin, not FROM admin
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("from-admin");
      }
      router.push("/admin");
      setLogoClickCount(0);
      return;
    }

    // Reset count after 2 seconds of no clicks
    clickTimeoutRef.current = setTimeout(() => {
      setLogoClickCount(0);
    }, 2000);
  };

  const [cachedSettings, setCachedSettings] = useState<KioskSettingsSnapshot | null>(null);
  const [cachedCategories, setCachedCategories] = useState<
    ReturnType<typeof readCachedCategories>
  >(null);
  const [cachedProducts, setCachedProducts] = useState<
    ReturnType<typeof readCachedProducts>
  >(null);

  useEffect(() => {
    migrateSettingsCache();
    setCachedSettings(readCachedSettings());
    setCachedCategories(readCachedCategories());
    setCachedProducts(readCachedProducts());
  }, []);

  useEffect(() => {
    const syncCache = () => {
      const snap = readCachedSettings();
      setCachedSettings(snap);
      if (snap) {
        // Instant UI update in the same WebView (admin → customer) without waiting on fetch
        queryClient.setQueryData(["settings"], {
          result: snap,
          status: 200,
          success: true,
          messages: {},
        });
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "kiosk-settings-cache-v3" && e.newValue) syncCache();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(getSettingsUpdatedEventName(), syncCache);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(getSettingsUpdatedEventName(), syncCache);
    };
  }, [queryClient]);

  const { data: categoriesData, isPending: categoriesPending } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const data = await productsApi.getCategories({ page_size: 1000 });
      writeCachedCategories(data);
      return data;
    },
    placeholderData: cachedCategories ?? undefined,
    staleTime: MENU_STALE_MS,
    gcTime: MENU_GC_MS,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 6,
    retryDelay: (n) => Math.min(2000 * 2 ** n, 8000),
    refetchInterval: (q) => {
      const result = q.state.data?.result as { results?: unknown[] } | unknown[] | undefined;
      const list = Array.isArray(result)
        ? result
        : Array.isArray((result as { results?: unknown[] } | undefined)?.results)
          ? (result as { results: unknown[] }).results
          : [];
      return list.length > 0 ? false : 8000;
    },
  });

  // Extract categories array from response (handle both array and paginated response)
  const categories = (() => {
    if (!categoriesData?.result) return [];
    
    // If result is an array, return it directly
    if (Array.isArray(categoriesData.result)) {
      return categoriesData.result;
    }
    
    // If result is paginated (has results property), return results array
    if (
      categoriesData.result &&
      typeof categoriesData.result === "object" &&
      "results" in categoriesData.result
    ) {
      return Array.isArray(categoriesData.result.results)
        ? categoriesData.result.results
        : [];
    }
    
    return [];
  })();

  useEffect(() => {
    if (!Array.isArray(categories) || categories.length === 0) return
    const stillValid =
      selectedCategory != null &&
      categories.some((c) => c.id === selectedCategory)
    if (stillValid) return
    setSelectedCategory(categories[0].id)
  }, [categories, selectedCategory])
  
  // Fetch all active products once; filter by category client-side for instant switches
  const {
    data: productsData,
    isPending: productsPending,
    isFetching: productsFetching,
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const data = await productsApi.getProducts({
        is_active: true,
        page_size: 1000,
      });
      writeCachedProducts(data);
      return data;
    },
    placeholderData: cachedProducts ?? undefined,
    staleTime: MENU_STALE_MS,
    gcTime: MENU_GC_MS,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 6,
    retryDelay: (n) => Math.min(2000 * 2 ** n, 8000),
    refetchInterval: (q) => {
      const n = q.state.data?.result?.results?.length ?? 0;
      return n > 0 ? false : 8000;
    },
  });

  const allProducts = productsData?.result?.results ?? [];
  const visibleProducts = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];
    if (selectedCategory == null) return allProducts;
    return allProducts.filter((p) => p.category === selectedCategory);
  }, [allProducts, selectedCategory]);

  const productsById = useMemo(() => {
    const map = new Map<number, (typeof allProducts)[number]>();
    for (const product of allProducts) {
      map.set(product.id, product);
    }
    return map;
  }, [allProducts]);

  // Keep cart product fee flags in sync with the live catalog (cached cart
  // snapshots often miss service_fee_applicable, so fees vanished from the UI
  // while the backend still charged them on the POS).
  useEffect(() => {
    if (productsById.size === 0) return;
    const { items: cartItems } = useCartStore.getState();
    if (cartItems.length === 0) return;
    let changed = false;
    const nextItems = cartItems.map((item) => {
      const live = productsById.get(item.product.id);
      if (!live) return item;
      const applicable = Boolean(live.service_fee_applicable);
      if (Boolean(item.product.service_fee_applicable) === applicable) return item;
      changed = true;
      return {
        ...item,
        product: { ...item.product, service_fee_applicable: applicable },
      };
    });
    if (changed) {
      useCartStore.setState({ items: nextItems });
    }
  }, [productsById]);

  const {
    data: settingsData,
    isLoading: settingsLoading,
    isFetched: settingsFetched,
    isPlaceholderData: settingsIsPlaceholder,
    dataUpdatedAt: settingsUpdatedAt,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const data = await settingsApi.getSettings();
      if (data?.result && Object.keys(data.result).length > 0) {
        writeCachedSettings(data.result);
        setCachedSettings(readCachedSettings());
        if (data.result.logo_url) {
          void preloadImage(data.result.logo_url);
        }
        if (data.result.landing_background_url) {
          void preloadImage(data.result.landing_background_url);
        }
      }
      return data;
    },
    placeholderData: cachedSettings
      ? {
          result: cachedSettings as Settings,
          status: 200,
          success: true,
          messages: {},
        }
      : undefined,
    staleTime: 0,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
    retry: 6,
    retryDelay: (n) => Math.min(2000 * 2 ** n, 8000),
  });

  // When admin changes products/categories, catalog_revision bumps → refresh menu
  useEffect(() => {
    const revision = Number(settingsData?.result?.catalog_revision);
    if (!Number.isFinite(revision)) return;

    if (lastCatalogRevisionRef.current === null) {
      const cachedRev = Number(cachedSettings?.catalog_revision);
      lastCatalogRevisionRef.current = revision;
      if (Number.isFinite(cachedRev) && cachedRev !== revision) {
        clearCachedMenu();
        void queryClient.invalidateQueries({ queryKey: ["products"] });
        void queryClient.invalidateQueries({ queryKey: ["categories"] });
      }
      return;
    }

    if (lastCatalogRevisionRef.current !== revision) {
      lastCatalogRevisionRef.current = revision;
      clearCachedMenu();
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  }, [settingsData?.result?.catalog_revision, cachedSettings?.catalog_revision, queryClient]);

  // Admin publish / other tab — apply instantly
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "kiosk-settings-cache-v3" || !e.newValue) return;
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  // Warm menu cache while customer is still on attract screen
  useEffect(() => {
    if (!showAttract) return;
    void queryClient.prefetchQuery({
      queryKey: ["categories"],
      queryFn: async () => {
        const data = await productsApi.getCategories({ page_size: 1000 });
        writeCachedCategories(data);
        return data;
      },
      staleTime: MENU_STALE_MS,
    });
    void queryClient.prefetchQuery({
      queryKey: ["products"],
      queryFn: async () => {
        const data = await productsApi.getProducts({
          is_active: true,
          page_size: 1000,
        });
        writeCachedProducts(data);
        return data;
      },
      staleTime: MENU_STALE_MS,
    });
  }, [showAttract, queryClient]);

  // Prefetch product images once list is available
  useEffect(() => {
    if (!Array.isArray(allProducts) || allProducts.length === 0) return;
    preloadImages(allProducts.map((p) => p.image).filter(Boolean));
  }, [allProducts]);

  // Prefer live API once fetched; cache only while placeholder / empty.
  const liveSettings = settingsData?.result;
  const settings =
    !settingsIsPlaceholder &&
    liveSettings &&
    Object.keys(liveSettings).length > 0
      ? mergeSettings(null, liveSettings)
      : mergeSettings(cachedSettings, liveSettings);
  const settingsCacheBust =
    (settings as { cached_at?: number }).cached_at ||
    cachedSettings?.cached_at ||
    settingsUpdatedAt ||
    0;
  const siteName = resolveSiteName(settings);
  const siteDescription = resolveSiteDescription(settings);
  const copyrightText = resolveCopyright(settings);
  const landingTheme = (settings.landing_theme || "cinema").toLowerCase();
  landingThemeRef.current = landingTheme;

  const resolvedLogoUrl =
    withMediaCacheBust(settings.logo_url, settingsCacheBust) ||
    (logoError ? undefined : "/logo.png");
  const resolvedBackgroundUrl = withMediaCacheBust(
    settings.landing_background_url,
    settingsCacheBust
  );

  useEffect(() => {
    if (!showAttract || !landingTheme) return;
    void analyticsApi.trackLanding({
      event_type: "impression",
      theme: landingTheme,
    });
  }, [showAttract, landingTheme]);

  // After leaving admin (or any tab focus), pull latest landing/branding settings
  useEffect(() => {
    const refreshSettings = () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSettings();
    };
    window.addEventListener("focus", refreshSettings);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refreshSettings);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [queryClient]);

  const cartHasFeeProduct = items.some((item) => {
    const live = productsById.get(item.product.id);
    return Boolean(
      live?.service_fee_applicable ?? item.product?.service_fee_applicable
    );
  });
  const serviceFeeDineIn = cartHasFeeProduct
    ? resolveServiceFeeAmount(settings, "dine_in")
    : 0;
  const serviceFeeTakeaway = cartHasFeeProduct
    ? resolveServiceFeeAmount(settings, "takeaway")
    : 0;
  const serviceTitleDineIn = resolveServiceTitle(settings, "dine_in");
  const serviceTitleTakeaway = resolveServiceTitle(settings, "takeaway");
  const packagingFeeDineIn = cartHasFeeProduct
    ? resolvePackagingFeeAmount(settings, "dine_in")
    : 0;
  const packagingFeeTakeaway = cartHasFeeProduct
    ? resolvePackagingFeeAmount(settings, "takeaway")
    : 0;
  const packagingTitleDineIn = resolvePackagingTitle(settings, "dine_in");
  const packagingTitleTakeaway = resolvePackagingTitle(settings, "takeaway");
  const pendingServiceFee =
    pendingFulfillment === "takeaway"
      ? serviceFeeTakeaway
      : pendingFulfillment === "dine_in"
        ? serviceFeeDineIn
        : 0;
  const pendingPackagingFee =
    pendingFulfillment === "takeaway"
      ? packagingFeeTakeaway
      : pendingFulfillment === "dine_in"
        ? packagingFeeDineIn
        : 0;
  const checkoutTotal =
    currentOrder?.totalAmount ??
    getTotalPrice() + pendingServiceFee + pendingPackagingFee;
  const cartLayout =
    (settings.cart_layout || cachedSettings?.cart_layout || 'side') === 'bottom'
      ? 'bottom'
      : 'side';
  const isBottomCart = cartLayout === 'bottom';
  
  // Reset logo error when settings change
  useEffect(() => {
    setLogoError(false)
  }, [settings.logo_url, settingsCacheBust])

  const createOrderMutation = useMutation({
    mutationFn: async (selectedFulfillment: "dine_in" | "takeaway") => {
      abortPaymentRequest();
      const controller = new AbortController();
      paymentAbortRef.current = controller;

      const orderData = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          option_ids: (item.selectedOptions || []).map((o) => o.id),
        })),
        fulfillment_type: selectedFulfillment,
        coupon_code:
          isCouponsEnabled(settings) && couponCode
            ? couponCode
            : undefined,
        landing_theme: landingThemeRef.current || undefined,
      };
      return await ordersApi.createOrder(orderData, controller.signal);
    },
    onSuccess: (response) => {
      paymentAbortRef.current = null;
      if (lateSettledRef.current) {
        return;
      }
      // پاک کردن timeout قبلی اگر وجود داشته باشد
      if (paymentModalTimeoutRef.current) {
        clearTimeout(paymentModalTimeoutRef.current);
        paymentModalTimeoutRef.current = null;
      }

      if (response.result) {
        const order = response.result;
        setCurrentOrder({
          id: order.id,
          orderNumber: order.order_number || `#${order.id}`,
          totalAmount: Number(order.total_amount) || undefined,
        });

        // بررسی وضعیت پرداخت از response
        // API بعد از انجام پرداخت (موفق یا ناموفق) response برمی‌گرداند
        if (
          order.payment_status === "paid" ||
          order.payment_status === "success" ||
          order.status === "paid"
        ) {
          lateSettledRef.current = true;
          stopLatePosWatch();
          setPaymentStatus("success");
          clearCart();
          
          // به‌روزرسانی لیست محصولات و موجودی‌ها بعد از پرداخت موفق
          // این باعث می‌شود که موجودی‌های جدید از سرور fetch شوند
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          
          // رفرش صفحه بعد از بسته شدن مودال انجام می‌شود
        } else if (
          order.payment_status === "cancelled" ||
          order.status === "cancelled"
        ) {
          updatePaymentFailureKind("cancelled");
          setPaymentStatus("cancelled");
          startLatePosWatch(order.id);
        } else if (order.payment_status === "failed") {
          const kind = resolvePaymentFailureKind({
            paymentStatus: order.payment_status,
            order,
            message: (order as { error_message?: string }).error_message,
          });
          updatePaymentFailureKind(kind);
          setPaymentStatus("failed");
          if (kind === "timeout" || kind === "cancelled") {
            startLatePosWatch(order.id);
          }
        } else {
          // اگر وضعیت مشخص نبود، همچنان در حالت waiting بمانیم
          // این باعث می‌شود که مودال باز بماند و منتظر نتیجه بماند
          // فقط اگر واقعاً وضعیت pending است، waiting بمانیم
          if (order.payment_status === "pending" || order.status === "pending") {
            // همچنان در حالت waiting بمانیم
            setPaymentStatus("waiting");
          } else {
            // اگر وضعیت نامشخص است، به عنوان failed در نظر بگیریم
            updatePaymentFailureKind("other");
            setPaymentStatus("failed");
          }
        }
      }
    },
    onError: (error: any) => {
      paymentAbortRef.current = null;
      console.error("Error creating order:", error);
      if (lateSettledRef.current) {
        return;
      }

      const isUserAbort =
        error.code === "ERR_CANCELED" ||
        error.name === "CanceledError" ||
        error.message === "canceled";

      if (isUserAbort) {
        clearPaymentTimers();
        updatePaymentFailureKind("cancelled");
        setPaymentStatus("cancelled");
        return;
      }
      
      // پاک کردن timeout قبلی اگر وجود داشته باشد
      if (paymentModalTimeoutRef.current) {
        clearTimeout(paymentModalTimeoutRef.current);
        paymentModalTimeoutRef.current = null;
      }
      
      const payload = extractPaymentErrorPayload(error.response?.data);
      const failureKind = resolvePaymentFailureKind({
        paymentFailureKind: payload.paymentFailureKind,
        paymentStatus: payload.order?.payment_status || payload.order?.status,
        order: payload.order,
        message: payload.message || error.message || "",
        gateway: payload.gateway,
      });
      updatePaymentFailureKind(failureKind);

      if (payload.order?.id) {
        setCurrentOrder({
          id: payload.order.id,
          orderNumber: payload.order.order_number || `#${payload.order.id}`,
        });
        if (failureKind === "cancelled" || failureKind === "timeout") {
          startLatePosWatch(payload.order.id);
        }
      }

      if (error.response?.status === 402) {
        setPaymentStatus(failureKind === "cancelled" ? "cancelled" : "failed");
        return;
      }

      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        console.warn("Request timeout - payment may still be processing");
        updatePaymentFailureKind("timeout");
        setPaymentStatus("failed");
        if (payload.order?.id) {
          startLatePosWatch(payload.order.id);
        }
        return;
      }

      setPaymentStatus(failureKind === "cancelled" ? "cancelled" : "failed");
    },
  });

  const handleCheckout = (selectedFulfillment: "dine_in" | "takeaway") => {
    if (items.length === 0) {
      return;
    }
    if (!selectedFulfillment) {
      return;
    }

    // Late POS watch stays in the background. If the device already cancelled,
    // the backend lock is free and pay proceeds. If the amount is still on the
    // reader, pay() returns busy (93) and the cart is kept. 
    // پاک کردن timeout قبلی اگر وجود داشته باشد
    if (paymentModalTimeoutRef.current) {
      clearTimeout(paymentModalTimeoutRef.current);
      paymentModalTimeoutRef.current = null;
    }
    
    // اگر mutation قبلی هنوز در حال انجام است، صبر کن تا تمام شود
    if (createOrderMutation.isPending) {
      return;
    }
    
    // Reset state
    lateSettledRef.current = false;
    setPaymentStatus("waiting");
    updatePaymentFailureKind(null);
    setCurrentOrder(null);
    setPendingFulfillment(selectedFulfillment);
    
    // ابتدا مودال را باز می‌کنیم با وضعیت "waiting"
    // چون API به صورت blocking کار می‌کند و منتظر می‌ماند
    setIsPaymentModalOpen(true);
    
    // سپس درخواست را ارسال می‌کنیم
    // این درخواست تا زمانی که کاربر کارت بکشد و پرداخت انجام شود منتظر می‌ماند
    createOrderMutation.mutate(selectedFulfillment);
  };

  const handlePaymentCancel = () => {
    if (createOrderMutation.isPending || paymentStatus === "waiting") {
      abortPosWait();
      clearPaymentTimers();
      updatePaymentFailureKind("cancelled");
      setPaymentStatus("cancelled");
      return;
    }

    clearPaymentTimers();

    if (paymentStatus === "success") {
      goToAttract();
      return;
    }
    finishPaymentFlow(paymentFailureKindRef.current);
  };

  const handlePaymentConfirm = () => {
    if (paymentStatus === "success") {
      goToAttract();
    }
  };

  const hasMenuData = Array.isArray(allProducts) && allProducts.length > 0;
  const showFullMenuSkeleton =
    (!isMounted && !showAttract) ||
    (!showAttract &&
      !hasMenuData &&
      !productsData &&
      (productsPending || categoriesPending));

  if (showFullMenuSkeleton) {
    return <CustomerMenuSkeleton productCount={6} />;
  }

  const cartProps = {
    onCheckout: handleCheckout,
    layout: cartLayout,
    serviceFeeDineIn,
    serviceFeeTakeaway,
    serviceTitleDineIn,
    serviceTitleTakeaway,
    packagingFeeDineIn,
    packagingFeeTakeaway,
    packagingTitleDineIn,
    packagingTitleTakeaway,
    couponsEnabled: isCouponsEnabled(settings),
    fulfillmentChoiceEnabled: settings.fulfillment_choice_enabled !== false,
    dineInEnabled: settings.dine_in_enabled !== false,
    takeawayEnabled: settings.takeaway_enabled !== false,
  } as const;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background dark:bg-background-dark">
      {showAttract && (
        <KioskAttractScreen
          key={[
            landingTheme,
            siteName,
            settings.landing_cta_text || "",
            settings.landing_accent_color || "",
            settings.landing_bg_color || "",
            settings.landing_text_color || "",
            settings.landing_muted_color || "",
            settings.landing_background_url || "",
            settings.logo_url || "",
            String(settingsCacheBust),
          ].join("|")}
          theme={landingTheme}
          siteName={siteName || "کیوسک"}
          logoUrl={resolvedLogoUrl}
          tagline={siteDescription || undefined}
          ctaText={settings.landing_cta_text || undefined}
          accentColor={settings.landing_accent_color || undefined}
          bgColor={settings.landing_bg_color || undefined}
          textColor={settings.landing_text_color || undefined}
          mutedColor={settings.landing_muted_color || undefined}
          backgroundUrl={resolvedBackgroundUrl}
          onStart={startOrdering}
          onSecretAdmin={() => {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("from-admin");
            }
            router.push("/admin");
          }}
        />
      )}

      {/* Header + categories span full page width; cart sits below */}
      <header className="z-30 w-full flex-shrink-0 border-b border-border bg-card dark:border-border-dark dark:bg-card-dark">
        <div className="px-6 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary transition-opacity hover:opacity-80"
                onClick={handleLogoClick}
                title="کلیک کنید"
              >
                {resolvedLogoUrl && resolvedLogoUrl !== "/logo.png" ? (
                  <Image
                    src={resolvedLogoUrl}
                    alt={siteName || "لوگو"}
                    width={40}
                    height={40}
                    className="object-cover"
                    unoptimized
                    onError={(e) => {
                      console.error("Logo load error:", settings.logo_url, e);
                      setLogoError(true);
                    }}
                    onLoad={() => {
                      setLogoError(false);
                    }}
                  />
                ) : !logoError ? (
                  <Image
                    src="/logo.png"
                    alt="لوگو"
                    width={40}
                    height={40}
                    className="object-cover"
                    unoptimized
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {siteName ? siteName.charAt(0) : "ک"}
                  </span>
                )}
              </div>
              <div>
                <h1 className="min-h-[1.5rem] text-xl font-bold text-text dark:text-text-dark">
                  {settingsLoading && !settingsFetched && !siteName ? (
                    <span className="inline-block h-6 w-36 animate-pulse rounded-lg bg-muted/70 dark:bg-white/10" />
                  ) : (
                    siteName
                  )}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <section className="w-full flex-shrink-0 border-b border-border/70 bg-background/80 px-6 py-3 backdrop-blur-sm dark:border-border-dark dark:bg-background-dark/80">
        {categoriesPending && categories.length === 0 ? (
          <CategoryFilterSkeleton />
        ) : (
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}
      </section>

      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden",
          isBottomCart ? "flex-col" : "flex-row"
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden",
            isBottomCart
              ? "w-full flex-1"
              : "w-2/3 border-l border-border dark:border-border-dark"
          )}
        >
          <main
            ref={productsScrollRef}
            className="kiosk-scroll min-h-0 flex-1 cursor-grab overflow-y-auto px-6 py-8 active:cursor-grabbing"
          >
            {productsPending && !hasMenuData ? (
              <ProductGridSkeleton count={6} />
            ) : visibleProducts.length > 0 ? (
              <div
                className={cn(
                  "grid grid-cols-1 gap-6 sm:grid-cols-2",
                  isBottomCart ? "lg:grid-cols-4" : "lg:grid-cols-3",
                  productsFetching && "opacity-90"
                )}
              >
                {visibleProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-text-secondary dark:text-gray-400">
                  محصولی یافت نشد
                </p>
              </div>
            )}
          </main>

          <footer className="mt-auto flex-shrink-0 border-t border-border py-6 dark:border-border-dark">
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-center text-sm text-text-secondary dark:text-gray-400">
                © {new Date().getFullYear()}
                {copyrightText ? ` ${copyrightText}` : ""}
              </p>
              {settings.contact_phone && (
                <div className="text-xs text-text-secondary dark:text-gray-400">
                  {settings.contact_phone}
                </div>
              )}
            </div>
          </footer>
        </div>

        {isBottomCart ? (
          <CartView {...cartProps} />
        ) : (
          <div className="flex min-h-0 w-1/3 flex-col overflow-hidden">
            <div className="min-h-0 flex-1">
              <CartView {...cartProps} />
            </div>
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        totalAmount={checkoutTotal}
        orderNumber={currentOrder?.orderNumber}
        onCancel={handlePaymentCancel}
        onConfirm={handlePaymentConfirm}
        isLoading={createOrderMutation.isPending}
        status={paymentStatus}
        failureKind={paymentFailureKind}
      />
    </div>
  );
}
