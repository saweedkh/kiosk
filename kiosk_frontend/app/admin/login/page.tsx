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
    <div className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md 2k:max-w-2xl 4k:max-w-4xl"
      >
        <div className="bg-card dark:bg-card-dark rounded-2xl shadow-xl p-8 2k:p-12 4k:p-16 border border-border dark:border-border-dark">
          <div className="text-center mb-8 2k:mb-12 4k:mb-16">
            <h1 className="text-3xl 2k:text-5xl 4k:text-7xl font-bold text-text dark:text-text-dark mb-2 2k:mb-4 4k:mb-6">
              پنل مدیریت
            </h1>
            <p className="text-text-secondary dark:text-gray-400 2k:text-xl 4k:text-2xl">
              لطفا وارد حساب کاربری خود شوید
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 2k:space-y-8 4k:space-y-10">
            <Input
              label="نام کاربری"
              type="text"
              placeholder="نام کاربری خود را وارد کنید"
              error={errors.username?.message}
              {...register('username')}
            />

            <Input
              label="رمز عبور"
              type="password"
              placeholder="رمز عبور خود را وارد کنید"
              error={errors.password?.message}
              {...register('password')}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 2k:p-4 4k:p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm 2k:text-base 4k:text-lg"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
            >
              ورود به پنل
            </Button>
          </form>

          <div className="mt-6 2k:mt-8 4k:mt-10 pt-6 2k:pt-8 4k:pt-10 border-t border-border dark:border-border-dark">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push('/')}
              className="w-full"
            >
              بازگشت
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

