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
import { formatNumber } from "@/lib/utils";
import {
  readCachedSettings,
  writeCachedSettings,
  readCachedCategories,
  writeCachedCategories,
  readCachedProducts,
  writeCachedProducts,
  preloadImage,
  preloadImages,
} from "@/lib/kiosk-persist";

/** Return to attract screen after this much idle time on the menu */
const KIOSK_IDLE_MS = 90_000;

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getTotalItems, items, getTotalPrice, clearCart } = useCartStore();

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

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const data = await productsApi.getCategories({ page_size: 1000 });
      writeCachedCategories(data);
      return data;
    },
    placeholderData: cachedCategories ?? undefined,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
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
  
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", selectedCategory],
    queryFn: async () => {
      const data = await productsApi.getProducts({
        category: selectedCategory || undefined,
        is_active: true,
      });
      // Persist full menu (uncategorized list) for cold-start speed
      if (selectedCategory == null) {
        writeCachedProducts(data);
      }
      return data;
    },
    placeholderData:
      selectedCategory == null ? cachedProducts ?? undefined : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: settingsData, isLoading: settingsLoading, isFetched: settingsFetched } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const data = await settingsApi.getSettings();
      if (data?.result) {
        writeCachedSettings(data.result);
        if (data.result.logo_url) {
          void preloadImage(data.result.logo_url);
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
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
  });

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
      staleTime: 10 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["products", null],
      queryFn: async () => {
        const data = await productsApi.getProducts({ is_active: true });
        writeCachedProducts(data);
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [showAttract, queryClient]);

  // Prefetch product images once list is available
  useEffect(() => {
    const results = productsData?.result?.results;
    if (!Array.isArray(results)) return;
    preloadImages(results.map((p: { image?: string }) => p.image).filter(Boolean));
  }, [productsData]);

  const settings = (settingsData?.result || cachedSettings || {}) as Settings;
  const siteName = resolveSiteName(settings);
  const siteDescription = resolveSiteDescription(settings);
  const copyrightText = resolveCopyright(settings);
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
        })),
        fulfillment_type: selectedFulfillment,
      };
      // این API به صورت blocking کار می‌کند و منتظر می‌ماند تا کاربر کارت بکشد
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

  return (
    <div className="h-screen flex overflow-hidden bg-background dark:bg-background-dark">
      {showAttract && (
        <KioskAttractScreen
          siteName={siteName || cachedSettings?.site_name || "کیوسک"}
          logoUrl={
            (settings.logo_url && settings.logo_url.trim() !== ""
              ? settings.logo_url
              : cachedSettings?.logo_url) ||
            (logoError ? null : "/logo.png")
          }
          tagline={siteDescription || cachedSettings?.description}
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
      <div className="w-2/3 flex flex-col border-l border-border dark:border-border-dark overflow-hidden">
        {/* Header */}
        <header className="bg-card dark:bg-card-dark border-b border-border dark:border-border-dark flex-shrink-0 z-30">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="relative w-14 h-14 bg-primary rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
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
                  <h1 className="text-2xl font-bold text-text dark:text-text-dark min-h-[2rem]">
                    {settingsLoading && !settingsFetched
                      ? ''
                      : siteName}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Products Section - Scrollable */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          {/* Category Filter */}
          <div className="mb-8">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card dark:bg-card-dark rounded-2xl h-96 animate-pulse"
                />
              ))}
            </div>
          ) : productsData?.result?.results ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {productsData.result.results.map((product, index) => (
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
            <div className="text-center py-16">
              <p className="text-text-secondary dark:text-gray-400">
                محصولی یافت نشد
              </p>
            </div>
          )}
        </main>
        {/* Footer */}
        <footer className="mt-12 py-6 border-t border-border dark:border-border-dark ">
          <div className="flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-text-secondary dark:text-gray-400 text-center">
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
      </div>

      {/* Right Section - Cart View (1/3) */}
      <div className="w-1/3 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
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
