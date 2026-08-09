'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/auth-store'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

const loginSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function AdminLoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authApi.login(data)

      if (response.success && response.result) {
        setAuth(
          response.result.access_token,
          response.result.refresh_token,
          response.result.user_info
        )
        router.push('/admin')
      } else {
        setError('نام کاربری یا رمز عبور اشتباه است')
      }
    } catch (err: any) {
      setError(
        err.response?.data?.messages?.non_field_errors?.[0] ||
          'خطا در ورود به سیستم'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(30_40%_97%)] p-4 dark:bg-[hsl(0_0%_7%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(55% 45% at 80% 10%, rgba(225,113,0,0.16), transparent 60%),
            radial-gradient(40% 35% at 10% 90%, rgba(225,113,0,0.08), transparent 55%)
          `,
        }}
      />

      <div className="absolute start-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/90 shadow-2xl shadow-black/5 backdrop-blur-xl dark:bg-card/80">
          <div className="border-b border-border/60 px-8 pb-6 pt-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white shadow-lg shadow-primary/30">
              K
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              ورود به پنل
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              مدیریت کیوسک فروشگاه
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-8 py-7">
            <Input
              label="نام کاربری"
              type="text"
              autoComplete="username"
              placeholder="نام کاربری"
              error={errors.username?.message}
              {...register('username')}
            />

            <Input
              label="رمز عبور"
              type="password"
              autoComplete="current-password"
              placeholder="رمز عبور"
              error={errors.password?.message}
              {...register('password')}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full rounded-xl"
            >
              ورود
            </Button>
          </form>

          <div className="border-t border-border/60 px-8 py-5">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => router.push('/')}
            >
              بازگشت به کیوسک
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
