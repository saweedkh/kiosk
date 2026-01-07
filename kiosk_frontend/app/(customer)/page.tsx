"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ProductCard } from "@/components/customer/ProductCard";
import { CartView } from "@/components/customer/CartView";
import { CategoryFilter } from "@/components/customer/CategoryFilter";
import { PaymentModal } from "@/components/customer/PaymentModal";
import { productsApi } from "@/lib/api/products";
import { ordersApi } from "@/lib/api/orders";
import { settingsApi } from "@/lib/api/settings";
import { useCartStore } from "@/lib/store/cart-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatNumber } from "@/lib/utils";

export default function CustomerPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "waiting" | "success" | "failed" | "cancelled"
  >("waiting");
  const [currentOrder, setCurrentOrder] = useState<{
    id: number;
    orderNumber: string;
  } | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cartClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paymentModalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cornerTapCountRef = useRef(0);
  const cornerTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      if (cornerTapTimeoutRef.current) {
        clearTimeout(cornerTapTimeoutRef.current);
      }
    };
  }, []);

  // Gesture detection for opening admin panel (5 taps in top-right corner)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (typeof window === 'undefined') return;
      
      const touch = e.touches[0];
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Check if touch is in top-right corner (last 100px from right, first 100px from top)
      const isInCorner = touch.clientX > windowWidth - 100 && touch.clientY < 100;
      
      if (isInCorner) {
        cornerTapCountRef.current += 1;
        
        // Reset counter after 2 seconds
        if (cornerTapTimeoutRef.current) {
          clearTimeout(cornerTapTimeoutRef.current);
        }
        
        cornerTapTimeoutRef.current = setTimeout(() => {
          cornerTapCountRef.current = 0;
        }, 2000);
        
        // If 5 taps detected, open admin panel
        if (cornerTapCountRef.current >= 5) {
          cornerTapCountRef.current = 0;
          router.push('/admin');
        }
      } else {
        // Reset counter if touch is not in corner
        cornerTapCountRef.current = 0;
        if (cornerTapTimeoutRef.current) {
          clearTimeout(cornerTapTimeoutRef.current);
        }
      }
    };

    // Also handle mouse clicks for testing (same corner)
    const handleClick = (e: MouseEvent) => {
      if (typeof window === 'undefined') return;
      
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      const isInCorner = e.clientX > windowWidth - 100 && e.clientY < 100;
      
      if (isInCorner) {
        cornerTapCountRef.current += 1;
        
        if (cornerTapTimeoutRef.current) {
          clearTimeout(cornerTapTimeoutRef.current);
        }
        
        cornerTapTimeoutRef.current = setTimeout(() => {
          cornerTapCountRef.current = 0;
        }, 2000);
        
        if (cornerTapCountRef.current >= 5) {
          cornerTapCountRef.current = 0;
          router.push('/admin');
        }
      } else {
        cornerTapCountRef.current = 0;
        if (cornerTapTimeoutRef.current) {
          clearTimeout(cornerTapTimeoutRef.current);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('click', handleClick);
    };
  }, [router]);

  // تابع helper برای رفرش صفحه
  const refreshPage = () => {
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        console.log('Refreshing page...');
        // استفاده از چند روش برای اطمینان از رفرش
        // روش 1: window.location.replace
        window.location.replace(window.location.pathname + window.location.search);
        // روش 2: اگر replace کار نکرد، از reload استفاده کن
        setTimeout(() => {
          window.location.reload();
        }, 50);
      }
    }, 300);
  };

  // تایمر برای بستن خودکار مودال در صورت موفق یا ناموفق بودن پرداخت
  useEffect(() => {
    // اگر وضعیت success یا failed است و مودال باز است، بعد از 5 ثانیه مودال را ببند
    if ((paymentStatus === "success" || paymentStatus === "failed") && isPaymentModalOpen) {
      // پاک کردن timeout قبلی اگر وجود داشته باشد
      if (paymentModalTimeoutRef.current) {
        clearTimeout(paymentModalTimeoutRef.current);
        paymentModalTimeoutRef.current = null;
      }

      // تایمر برای بستن خودکار مودال بعد از 5 ثانیه
      paymentModalTimeoutRef.current = setTimeout(() => {
        // استفاده از functional update برای اطمینان از اینکه latest state را می‌خوانیم
        setIsPaymentModalOpen((prevIsOpen) => {
          // اگر مودال هنوز باز است، آن را ببند
          if (prevIsOpen) {
            setCurrentOrder(null);
            setPaymentStatus("waiting");
            clearCart(); // خالی کردن سبد خرید
            refreshPage();
            return false;
          }
          return prevIsOpen;
        });
        paymentModalTimeoutRef.current = null;
      }, 5000); // 5 ثانیه

      // Cleanup function - فقط timeout را پاک کن، نه state را تغییر بده
      return () => {
        if (paymentModalTimeoutRef.current) {
          clearTimeout(paymentModalTimeoutRef.current);
          paymentModalTimeoutRef.current = null;
        }
      };
    } else {
      // اگر وضعیت success یا failed نیست یا مودال بسته است، timeout را پاک کن
      if (paymentModalTimeoutRef.current) {
        clearTimeout(paymentModalTimeoutRef.current);
        paymentModalTimeoutRef.current = null;
      }
    }
  }, [paymentStatus, isPaymentModalOpen, clearCart]);

  // پاک کردن خودکار سبد خرید بعد از 10 دقیقه عدم استفاده
  useEffect(() => {
    // اگر سبد خرید خالی است، timer را پاک کن
    if (items.length === 0) {
      if (cartClearTimeoutRef.current) {
        clearTimeout(cartClearTimeoutRef.current);
        cartClearTimeoutRef.current = null;
      }
      return;
    }

    // اگر timer قبلی وجود دارد، آن را پاک کن
    if (cartClearTimeoutRef.current) {
      clearTimeout(cartClearTimeoutRef.current);
    }

    // Timer جدید برای پاک کردن سبد خرید بعد از 10 دقیقه
    cartClearTimeoutRef.current = setTimeout(() => {
      clearCart();
      cartClearTimeoutRef.current = null;
    }, 600000); // 10 دقیقه = 600000 میلی‌ثانیه

    // Cleanup function
    return () => {
      if (cartClearTimeoutRef.current) {
        clearTimeout(cartClearTimeoutRef.current);
        cartClearTimeoutRef.current = null;
      }
    };
  }, [items, clearCart]);

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

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productsApi.getCategories({ page_size: 1000 }), // Get all categories
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
    queryFn: () => productsApi.getProducts({
        category: selectedCategory || undefined,
        is_active: true,
      }),
  });

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.getSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // فقط یک بار retry کن
  });

  const settings = settingsData?.result || {};
  
  // Reset logo error when settings change
  useEffect(() => {
    if (settingsData) {
      console.log('Settings loaded:', settings)
      console.log('Logo URL:', settings.logo_url)
      // Reset logo error when new settings are loaded
      setLogoError(false)
    }
  }, [settingsData, settings])

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
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
          order.payment_status === "failed" ||
          order.status === "cancelled"
        ) {
          setPaymentStatus("failed");
          // رفرش صفحه بعد از بسته شدن مودال انجام می‌شود
        } else {
          // اگر وضعیت مشخص نبود، به عنوان waiting نمایش بده
          setPaymentStatus("waiting");
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
      
      // بررسی اینکه آیا timeout بوده یا خطای دیگر
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        setPaymentStatus("failed");
        // رفرش صفحه بعد از بسته شدن مودال انجام می‌شود
      } else {
        // بررسی اینکه آیا این خطای پرداخت است یا خطای واقعی API
        // اگر response.data وجود دارد و payment_status failed است، این خطای پرداخت است
        const responseData = error.response?.data;
        const isPaymentError = 
          (responseData?.result?.payment_status === "failed" ||
           responseData?.result?.status === "failed" ||
           responseData?.result?.status === "cancelled") &&
          responseData?.result?.id; // اگر order id وجود دارد، یعنی order ایجاد شده و فقط پرداخت ناموفق بوده
        
        if (isPaymentError) {
          // این یک خطای پرداخت است، نه خطای API
          // وضعیت را failed تنظیم می‌کنیم و پیام در PaymentModal نمایش داده می‌شود
          setPaymentStatus("failed");
          // اگر order data وجود دارد، آن را تنظیم کنیم
          if (responseData?.result) {
            const order = responseData.result;
            setCurrentOrder({
              id: order.id,
              orderNumber: order.order_number || `#${order.id}`,
            });
          }
          // رفرش صفحه بعد از بسته شدن مودال انجام می‌شود
        } else {
          // این یک خطای واقعی API است (مثلاً 500، 400، network error)
          setPaymentStatus("failed");
          // رفرش صفحه بعد از بسته شدن مودال انجام می‌شود
        }
      }
    },
  });

  const handleCheckout = () => {
    if (items.length === 0) {
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
    
    // ابتدا مودال را باز می‌کنیم با وضعیت "waiting"
    // چون API به صورت blocking کار می‌کند و منتظر می‌ماند
    setIsPaymentModalOpen(true);
    
    // سپس درخواست را ارسال می‌کنیم
    // این درخواست تا زمانی که کاربر کارت بکشد و پرداخت انجام شود منتظر می‌ماند
    createOrderMutation.mutate();
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
      setIsPaymentModalOpen(false);
      setCurrentOrder(null);
      setPaymentStatus("waiting");
      clearCart(); // خالی کردن سبد خرید
      
      // رفرش صفحه برای reset کردن state ها و جلوگیری از باگ
      refreshPage();
    }
  };

  const handlePaymentConfirm = () => {
    // فقط برای success مودال را ببند
    if (paymentStatus === "success") {
      setIsPaymentModalOpen(false);
      setCurrentOrder(null);
      setPaymentStatus("waiting");
      clearCart();
      
      // رفرش صفحه برای reset کردن state ها و جلوگیری از باگ
      refreshPage();
    }
    // برای failed و cancelled، مودال را باز نگه دار
    // کاربر باید با دکمه "بستن" یا کلیک روی backdrop ببندد
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background dark:bg-background-dark">
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
                      alt={settings.site_name || 'لوگو'}
                      width={56}
                      height={56}
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        console.error('Logo load error:', settings.logo_url, e)
                        setLogoError(true)
                      }}
                      onLoad={() => {
                        console.log('Logo loaded successfully:', settings.logo_url)
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
                    <span className="text-white font-bold text-xl">ن</span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text dark:text-text-dark">
                    {settings.site_name || 'فروشگاه ساوید'}
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
              © {new Date().getFullYear()} {settings.copyright_text || 'تمامی حقوق محفوظ است.'}
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
          <CartView onCheckout={handleCheckout} />
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        totalAmount={getTotalPrice()}
        orderNumber={currentOrder?.orderNumber}
        onCancel={handlePaymentCancel}
        onConfirm={handlePaymentConfirm}
        isLoading={createOrderMutation.isPending}
        status={paymentStatus}
      />
    </div>
  );
}
