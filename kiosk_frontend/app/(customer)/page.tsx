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
import {
  settingsApi,
  resolveCopyright,
  resolveSiteName,
  resolveSiteDescription,
  type Settings,
} from "@/lib/api/settings";
import { useCartStore } from "@/lib/store/cart-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { analyticsApi } from "@/lib/api/dashboard";
import { formatNumber } from "@/lib/utils";
import type { LandingTheme } from "@/types";

const LANDING_THEMES: LandingTheme[] = ["cinema", "neon", "fresh", "editorial"];
const AB_THEME_STORAGE_KEY = "kiosk-landing-ab-theme";

function pickLandingTheme(settingsLike: {
  landing_theme?: string;
  landing_theme_b?: string;
  landing_ab_enabled?: boolean;
  landing_ab_split?: number;
} | null | undefined): string {
  const themeA = (settingsLike?.landing_theme || "cinema").toLowerCase();
  if (!settingsLike?.landing_ab_enabled) return themeA;
  if (typeof window !== "undefined") {
    const sticky = sessionStorage.getItem(AB_THEME_STORAGE_KEY);
    if (sticky && LANDING_THEMES.includes(sticky as LandingTheme)) return sticky;
  }
  const themeB = (settingsLike?.landing_theme_b || "neon").toLowerCase();
  const split = Math.min(Math.max(Number(settingsLike?.landing_ab_split ?? 50), 0), 100);
  const picked = Math.random() * 100 < split ? themeA : themeB;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(AB_THEME_STORAGE_KEY, picked);
  }
  return picked;
}
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
} from "@/lib/kiosk-persist";
import {
  CustomerMenuSkeleton,
  CategoryFilterSkeleton,
  ProductGridSkeleton,
} from "@/components/customer/CustomerMenuSkeleton";

/** Return to attract screen after this much idle time on the menu */
const KIOSK_IDLE_MS = 90_000;
/** Menu stays cached until catalog_revision bumps (admin product/category change). */
const MENU_STALE_MS = Infinity;
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
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCatalogRevisionRef = useRef<number | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getTotalItems, items, getTotalPrice, clearCart, couponCode } = useCartStore();
  const [activeLandingTheme, setActiveLandingTheme] = useState<string>("cinema");

  useEffect(() => {
    setIsMounted(true);
    
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
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  const goToAttract = () => {
    if (paymentModalTimeoutRef.current) {
      clearTimeout(paymentModalTimeoutRef.current);
      paymentModalTimeoutRef.current = null;
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPaymentModalOpen(false);
    setCurrentOrder(null);
    setPaymentStatus("waiting");
    setPendingFulfillment(null);
    setSelectedCategory(null);
    clearCart();
    setShowAttract(true);
  };

  const startOrdering = () => {
    clearCart();
    setSelectedCategory(null);
    setPendingFulfillment(null);
    setShowAttract(false);
    void analyticsApi.trackLanding({
      event_type: "start",
      theme: activeLandingTheme,
    });
  };

  // تایمر برای بستن خودکار مودال در صورت موفق یا ناموفق بودن پرداخت → بازگشت به لندینگ
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
            goToAttract();
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
  }, [paymentStatus, isPaymentModalOpen]);

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

  const cachedSettings = useMemo(() => readCachedSettings(), []);
  const cachedCategories = useMemo(() => readCachedCategories(), []);
  const cachedProducts = useMemo(() => readCachedProducts(), []);

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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const allProducts = productsData?.result?.results ?? [];
  const visibleProducts = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];
    if (selectedCategory == null) return allProducts;
    return allProducts.filter((p) => p.category === selectedCategory);
  }, [allProducts, selectedCategory]);

  const { data: settingsData, isLoading: settingsLoading, isFetched: settingsFetched } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const data = await settingsApi.getSettings();
      if (data?.result) {
        writeCachedSettings(data.result);
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
    // Lightweight poll so kiosk picks up admin branding + catalog_revision
    staleTime: 0,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 12_000,
    retry: 2,
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

  // Admin tab writes localStorage — sync instantly without waiting for poll
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "kiosk-settings-cache-v1" || !e.newValue) return;
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

  const settings = (settingsData?.result || cachedSettings || {}) as Settings;
  const siteName = resolveSiteName(settings);
  const siteDescription = resolveSiteDescription(settings);
  const copyrightText = resolveCopyright(settings);

  useEffect(() => {
    const theme = pickLandingTheme(settings);
    setActiveLandingTheme(theme);
  }, [
    settings.landing_theme,
    settings.landing_theme_b,
    settings.landing_ab_enabled,
    settings.landing_ab_split,
  ]);

  useEffect(() => {
    if (!showAttract || !activeLandingTheme) return;
    void analyticsApi.trackLanding({
      event_type: "impression",
      theme: activeLandingTheme,
    });
  }, [showAttract, activeLandingTheme]);

  const configuredServiceFee =
    settings.service_enabled
      ? Math.max(0, Math.round(Number(settings.service_fee) || 0))
      : 0;
  const cartHasServiceProduct = items.some(
    (item) => Boolean(item.product?.service_fee_applicable)
  );
  const baseServiceFee =
    configuredServiceFee > 0 && cartHasServiceProduct ? configuredServiceFee : 0;
  const serviceFeeOnDineIn = settings.service_fee_dine_in !== false;
  const serviceFeeOnTakeaway = settings.service_fee_takeaway !== false;
  const pendingServiceFee =
    pendingFulfillment === "takeaway"
      ? serviceFeeOnTakeaway
        ? baseServiceFee
        : 0
      : pendingFulfillment === "dine_in"
        ? serviceFeeOnDineIn
          ? baseServiceFee
          : 0
        : 0;
  const checkoutTotal =
    currentOrder?.totalAmount ?? getTotalPrice() + pendingServiceFee;
  
  // Reset logo error when settings change
  useEffect(() => {
    if (settingsData) {
      setLogoError(false)
    }
  }, [settingsData])

  const createOrderMutation = useMutation({
    mutationFn: async (selectedFulfillment: "dine_in" | "takeaway") => {
      const orderData = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          option_ids: (item.selectedOptions || []).map((o) => o.id),
        })),
        fulfillment_type: selectedFulfillment,
        coupon_code: couponCode || undefined,
        landing_theme: activeLandingTheme || undefined,
      };
      return await ordersApi.createOrder(orderData);
    },
    onSuccess: (response) => {
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
          setPaymentStatus("cancelled");
        } else if (order.payment_status === "failed") {
          setPaymentStatus("failed");
        } else {
          // اگر وضعیت مشخص نبود، همچنان در حالت waiting بمانیم
          // این باعث می‌شود که مودال باز بماند و منتظر نتیجه بماند
          // فقط اگر واقعاً وضعیت pending است، waiting بمانیم
          if (order.payment_status === "pending" || order.status === "pending") {
            // همچنان در حالت waiting بمانیم
            setPaymentStatus("waiting");
          } else {
            // اگر وضعیت نامشخص است، به عنوان failed در نظر بگیریم
            // تا کاربر بداند که مشکلی پیش آمده
            setPaymentStatus("failed");
          }
        }
      }
    },
    onError: (error: any) => {
      console.error("Error creating order:", error);
      
      // پاک کردن timeout قبلی اگر وجود داشته باشد
      if (paymentModalTimeoutRef.current) {
        clearTimeout(paymentModalTimeoutRef.current);
        paymentModalTimeoutRef.current = null;
      }
      
      const responseData = error.response?.data;
      const messages = responseData?.messages;
      const orderFromError =
        messages?.order ||
        (Array.isArray(responseData?.result) ? null : responseData?.result);
      const paymentMessage = String(
        messages?.message ||
          messages?.error ||
          error.message ||
          ""
      );
      const isCancelled =
        orderFromError?.payment_status === "cancelled" ||
        orderFromError?.status === "cancelled" ||
        paymentMessage.includes("لغو");

      if (orderFromError?.id) {
        setCurrentOrder({
          id: orderFromError.id,
          orderNumber: orderFromError.order_number || `#${orderFromError.id}`,
        });
      }

      // 402 = پرداخت ناموفق/لغو شده از کارتخوان — از صفحه انتظار خارج شو
      if (error.response?.status === 402 || isCancelled) {
        setPaymentStatus(isCancelled ? "cancelled" : "failed");
        return;
      }

      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        console.warn("Request timeout - payment may still be processing");
        setPaymentStatus("failed");
        return;
      }

      setPaymentStatus(isCancelled ? "cancelled" : "failed");
    },
  });

  const handleCheckout = (selectedFulfillment: "dine_in" | "takeaway") => {
    if (items.length === 0) {
      return;
    }
    if (!selectedFulfillment) {
      return;
    }
    
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
    setPaymentStatus("waiting");
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
    // اگر درخواست در حال انجام است یا وضعیت waiting است، نمی‌توانیم آن را لغو کنیم
    // چون API در حال انتظار برای پرداخت است
    // کاربر باید منتظر بماند تا پاسخ از بک‌اند بیاید
    if (createOrderMutation.isPending || paymentStatus === "waiting") {
      // نمی‌توانیم در حین پردازش یا waiting لغو کنیم
      // کاربر باید منتظر بماند تا پاسخ از بک‌اند بیاید
      return;
    }
    
    // پاک کردن timeout قبلی اگر وجود داشته باشد
    if (paymentModalTimeoutRef.current) {
      clearTimeout(paymentModalTimeoutRef.current);
      paymentModalTimeoutRef.current = null;
    }
    
    // فقط برای وضعیت‌های نهایی (success, failed, cancelled) مودال را ببند
    if (paymentStatus === "success" || paymentStatus === "failed" || paymentStatus === "cancelled") {
      goToAttract();
    }
  };

  const handlePaymentConfirm = () => {
    // فقط برای success مودال را ببند
    if (paymentStatus === "success") {
      goToAttract();
    }
    // برای failed و cancelled، مودال را باز نگه دار
    // کاربر باید با دکمه "بستن" یا کلیک روی backdrop ببندد
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

  return (
    <div className="flex h-dvh overflow-hidden bg-background dark:bg-background-dark">
      {showAttract && (
        <KioskAttractScreen
          key={[
            activeLandingTheme,
            settings.landing_cta_text || "",
            settings.landing_accent_color || "",
            settings.landing_bg_color || "",
            settings.landing_text_color || "",
            settings.landing_muted_color || "",
            settings.landing_background_url || "",
            siteName,
          ].join("|")}
          siteName={siteName || cachedSettings?.site_name || "کیوسک"}
          logoUrl={
            (settings.logo_url && settings.logo_url.trim() !== ""
              ? settings.logo_url
              : cachedSettings?.logo_url) ||
            (logoError ? null : "/logo.png")
          }
          tagline={siteDescription || cachedSettings?.description}
          theme={activeLandingTheme || "cinema"}
          ctaText={
            settings.landing_cta_text ||
            cachedSettings?.landing_cta_text ||
            undefined
          }
          accentColor={
            settings.landing_accent_color ||
            cachedSettings?.landing_accent_color ||
            undefined
          }
          bgColor={
            settings.landing_bg_color ||
            cachedSettings?.landing_bg_color ||
            undefined
          }
          textColor={
            settings.landing_text_color ||
            cachedSettings?.landing_text_color ||
            undefined
          }
          mutedColor={
            settings.landing_muted_color ||
            cachedSettings?.landing_muted_color ||
            undefined
          }
          backgroundUrl={
            settings.landing_background_url ||
            cachedSettings?.landing_background_url ||
            undefined
          }
          onStart={startOrdering}
          onSecretAdmin={() => {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("from-admin");
            }
            router.push("/admin");
          }}
        />
      )}
      {/* Left Section - Header + Products (2/3) */}
      <div className="flex min-h-0 w-2/3 flex-col overflow-hidden border-l border-border dark:border-border-dark">
        {/* Header */}
        <header className="z-30 flex-shrink-0 border-b border-border bg-card dark:border-border-dark dark:bg-card-dark">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="relative flex h-14 w-14 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary transition-opacity hover:opacity-80"
                  onClick={handleLogoClick}
                  title="کلیک کنید"
                >
                  {settings.logo_url && settings.logo_url.trim() !== '' ? (
                    <Image
                      src={settings.logo_url}
                      alt={siteName || 'لوگو'}
                      width={56}
                      height={56}
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        console.error('Logo load error:', settings.logo_url, e)
                        setLogoError(true)
                      }}
                      onLoad={() => {
                        setLogoError(false)
                      }}
                    />
                  ) : !logoError ? (
                    <Image
                      src="/logo.png"
                      alt="لوگو"
                      width={56}
                      height={56}
                      className="object-cover"
                      unoptimized
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <span className="text-white font-bold text-xl">
                      {siteName ? siteName.charAt(0) : 'ک'}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="min-h-[2rem] text-2xl font-bold text-text dark:text-text-dark">
                    {settingsLoading && !settingsFetched && !siteName ? (
                      <span className="inline-block h-7 w-40 animate-pulse rounded-lg bg-muted/70 dark:bg-white/10" />
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

        {/* Products Section - Scrollable (min-h-0 required for flex touch scroll) */}
        <main className="kiosk-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-8">
          <div className="mb-8">
            {categoriesPending && categories.length === 0 ? (
              <CategoryFilterSkeleton />
            ) : (
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            )}
          </div>

          {productsPending && !hasMenuData ? (
            <ProductGridSkeleton count={6} />
          ) : visibleProducts.length > 0 ? (
            <div
              className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${
                productsFetching ? "opacity-90" : ""
              }`}
            >
              {visibleProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.35) }}
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

          <footer className="mt-12 border-t border-border py-6 dark:border-border-dark">
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-center text-sm text-text-secondary dark:text-gray-400">
                © {new Date().getFullYear()}
                {copyrightText ? ` ${copyrightText}` : ''}
              </p>
              {settings.contact_phone && (
                <div className="text-xs text-text-secondary dark:text-gray-400">
                  {settings.contact_phone}
                </div>
              )}
            </div>
          </footer>
        </main>
      </div>

      {/* Right Section - Cart View (1/3) */}
      <div className="flex min-h-0 w-1/3 flex-col overflow-hidden">
        <div className="min-h-0 flex-1">
          <CartView
            onCheckout={handleCheckout}
            serviceFee={baseServiceFee}
            serviceFeeOnDineIn={serviceFeeOnDineIn}
            serviceFeeOnTakeaway={serviceFeeOnTakeaway}
          />
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        totalAmount={checkoutTotal}
        orderNumber={currentOrder?.orderNumber}
        onCancel={handlePaymentCancel}
        onConfirm={handlePaymentConfirm}
        isLoading={createOrderMutation.isPending}
        status={paymentStatus}
      />
    </div>
  );
}
