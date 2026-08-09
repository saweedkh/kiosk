'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi, type AdminGroup, type AdminManagedUser } from '@/lib/api/accounts'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Switch } from '@/components/shared/Switch'
import {
  AdminPageHeader,
  AdminSegmented,
} from '@/components/admin/ui/primitives'
import { translateError } from '@/lib/utils'
import { useAuthStore } from '@/lib/store/auth-store'

type Section = 'users' | 'groups'

export function UsersManager() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const canEditSuperuser = !!currentUser?.is_superuser
  const [section, setSection] = useState<Section>('users')
  const [error, setError] = useState<string | null>(null)

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: accountsApi.getUsers,
  })
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: accountsApi.getGroups,
  })
  const { data: permissionsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: accountsApi.getPermissions,
  })

  const users = usersData?.result?.results || []
  const groups = groupsData?.result?.results || []
  const permissions = permissionsData?.result?.items || []

  const [editingUser, setEditingUser] = useState<AdminManagedUser | null>(null)
  const [creatingUser, setCreatingUser] = useState(false)
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    is_active: true,
    is_staff: true,
    is_superuser: false,
    group_ids: [] as number[],
    bale_chat_id: '',
    bale_enabled: false,
  })

  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({
    name: '',
    permissions: [] as string[],
  })

  const resetUserForm = () => {
    setUserForm({
      username: '',
      password: '',
      first_name: '',
      last_name: '',
      email: '',
      is_active: true,
      is_staff: true,
      is_superuser: false,
      group_ids: [],
      bale_chat_id: '',
      bale_enabled: false,
    })
  }

  const openCreateUser = () => {
    resetUserForm()
    setEditingUser(null)
    setCreatingUser(true)
    setError(null)
  }

  const openEditUser = (user: AdminManagedUser) => {
    if (user.is_superuser && !canEditSuperuser) {
      setError('فقط سوپریوزر می‌تواند حساب سوپریوزر را ویرایش کند')
      return
    }
    setCreatingUser(false)
    setEditingUser(user)
    setUserForm({
      username: user.username,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      is_active: user.is_active,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
      group_ids: user.groups.map((g) => g.id),
      bale_chat_id: user.bale_chat_id || '',
      bale_enabled: user.bale_enabled,
    })
    setError(null)
  }

  const userMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        const payload: Parameters<typeof accountsApi.updateUser>[1] = {
          password: userForm.password || undefined,
          first_name: userForm.first_name,
          last_name: userForm.last_name,
          email: userForm.email,
          is_active: userForm.is_active,
          is_staff: userForm.is_staff,
          group_ids: userForm.group_ids,
          bale_chat_id: userForm.bale_chat_id,
          bale_enabled: userForm.bale_enabled,
        }
        if (canEditSuperuser) {
          payload.is_superuser = userForm.is_superuser
        }
        return accountsApi.updateUser(editingUser.id, payload)
      }
      return accountsApi.createUser({
        username: userForm.username,
        password: userForm.password,
        first_name: userForm.first_name,
        last_name: userForm.last_name,
        email: userForm.email,
        is_active: userForm.is_active,
        is_staff: userForm.is_staff,
        is_superuser: canEditSuperuser ? userForm.is_superuser : false,
        group_ids: userForm.group_ids,
        bale_chat_id: userForm.bale_chat_id,
        bale_enabled: userForm.bale_enabled,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setCreatingUser(false)
      setEditingUser(null)
      resetUserForm()
      setError(null)
    },
    onError: (err) => setError(translateError(err) || 'خطا در ذخیره کاربر'),
  })

  const deleteUserMutation = useMutation({
    mutationFn: accountsApi.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => setError(translateError(err) || 'خطا در حذف کاربر'),
  })

  const openCreateGroup = () => {
    setEditingGroup(null)
    setCreatingGroup(true)
    setGroupForm({ name: '', permissions: [] })
    setError(null)
  }

  const openEditGroup = (group: AdminGroup) => {
    setCreatingGroup(false)
    setEditingGroup(group)
    setGroupForm({ name: group.name, permissions: [...group.permissions] })
    setError(null)
  }

  const groupMutation = useMutation({
    mutationFn: async () => {
      if (editingGroup) {
        return accountsApi.updateGroup(editingGroup.id, groupForm)
      }
      return accountsApi.createGroup(groupForm)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      setCreatingGroup(false)
      setEditingGroup(null)
      setGroupForm({ name: '', permissions: [] })
      setError(null)
    },
    onError: (err) => setError(translateError(err) || 'خطا در ذخیره گروه'),
  })

  const deleteGroupMutation = useMutation({
    mutationFn: accountsApi.deleteGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-groups'] }),
    onError: (err) => setError(translateError(err) || 'خطا در حذف گروه'),
  })

  const toggleGroupId = (id: number) => {
    setUserForm((prev) => ({
      ...prev,
      group_ids: prev.group_ids.includes(id)
        ? prev.group_ids.filter((x) => x !== id)
        : [...prev.group_ids, id],
    }))
  }

  const togglePermission = (code: string) => {
    setGroupForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(code)
        ? prev.permissions.filter((x) => x !== code)
        : [...prev.permissions, code],
    }))
  }

  const showUserForm = creatingUser || !!editingUser
  const showGroupForm = creatingGroup || !!editingGroup

  const permissionHint = useMemo(
    () => 'گروه «اپراتور» به‌صورت پیش‌فرض گزارش، موجودی و افزودن/ویرایش محصول دارد و حذف ندارد.',
    []
  )

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="کاربران و دسترسی‌ها"
        description={permissionHint}
        actions={
          <AdminSegmented
            value={section}
            onChange={setSection}
            options={[
              { id: 'users', label: 'کاربران' },
              { id: 'groups', label: 'گروه‌ها' },
            ]}
          />
        }
      />

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {section === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateUser}>کاربر جدید</Button>
          </div>

          {showUserForm && (
            <div className="rounded-2xl border border-border dark:border-border-dark bg-card dark:bg-card-dark p-6 space-y-4">
              <h3 className="text-lg font-bold">{editingUser ? 'ویرایش کاربر' : 'ایجاد کاربر'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!editingUser && (
                  <Input
                    label="نام کاربری"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  />
                )}
                <Input
                  label={editingUser ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
                <Input
                  label="نام"
                  value={userForm.first_name}
                  onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                />
                <Input
                  label="نام خانوادگی"
                  value={userForm.last_name}
                  onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                />
                <Input
                  label="ایمیل"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
                <Input
                  label="شناسه چت بله (chat_id)"
                  value={userForm.bale_chat_id}
                  onChange={(e) => setUserForm({ ...userForm, bale_chat_id: e.target.value })}
                  placeholder="مثلاً 123456789"
                />
              </div>

              <div className="flex flex-wrap gap-6">
                <Switch
                  checked={userForm.is_active}
                  onChange={(checked) => setUserForm({ ...userForm, is_active: checked })}
                  label="فعال"
                />
                <Switch
                  checked={userForm.is_staff}
                  onChange={(checked) => setUserForm({ ...userForm, is_staff: checked })}
                  label="دسترسی پنل"
                />
                {canEditSuperuser && (
                  <Switch
                    checked={userForm.is_superuser}
                    onChange={(checked) => setUserForm({ ...userForm, is_superuser: checked })}
                    label="سوپریوزر"
                  />
                )}
                <Switch
                  checked={userForm.bale_enabled}
                  onChange={(checked) => setUserForm({ ...userForm, bale_enabled: checked })}
                  label="دسترسی ربات بله"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">گروه‌ها</p>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroupId(g.id)}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        userForm.group_ids.includes(g.id)
                          ? 'bg-primary text-white border-primary'
                          : 'border-border dark:border-border-dark'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => userMutation.mutate()} isLoading={userMutation.isPending}>
                  ذخیره
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreatingUser(false)
                    setEditingUser(null)
                  }}
                >
                  انصراف
                </Button>
              </div>
            </div>
          )}

          {usersLoading ? (
            <p>در حال بارگذاری...</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border dark:border-border-dark">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-right">کاربر</th>
                    <th className="px-4 py-3 text-right">گروه‌ها</th>
                    <th className="px-4 py-3 text-right">بله</th>
                    <th className="px-4 py-3 text-right">وضعیت</th>
                    <th className="px-4 py-3 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-border dark:border-border-dark">
                      <td className="px-4 py-3">
                        <div className="font-bold">{user.username}</div>
                        <div className="text-muted-foreground">
                          {user.first_name} {user.last_name}
                          {user.is_superuser ? ' · سوپریوزر' : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.groups.map((g) => g.name).join('، ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {user.bale_enabled ? (
                          <span>فعال · {user.bale_chat_id || '—'}</span>
                        ) : (
                          'غیرفعال'
                        )}
                      </td>
                      <td className="px-4 py-3">{user.is_active ? 'فعال' : 'غیرفعال'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {!(user.is_superuser && !canEditSuperuser) && (
                            <Button size="sm" variant="outline" onClick={() => openEditUser(user)}>
                              ویرایش
                            </Button>
                          )}
                          {!(user.is_superuser && !canEditSuperuser) && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                if (confirm(`حذف کاربر ${user.username}؟`)) {
                                  deleteUserMutation.mutate(user.id)
                                }
                              }}
                            >
                              حذف
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {section === 'groups' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateGroup}>گروه جدید</Button>
          </div>

          {showGroupForm && (
            <div className="rounded-2xl border border-border dark:border-border-dark bg-card dark:bg-card-dark p-6 space-y-4">
              <h3 className="text-lg font-bold">{editingGroup ? 'ویرایش گروه' : 'ایجاد گروه'}</h3>
              <Input
                label="نام گروه"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
              <div>
                <p className="mb-2 text-sm font-medium">دسترسی‌ها</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {permissions.map((p) => (
                    <label
                      key={p.codename}
                      className="flex items-center gap-2 rounded-lg border border-border dark:border-border-dark px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={groupForm.permissions.includes(p.codename)}
                        onChange={() => togglePermission(p.codename)}
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => groupMutation.mutate()} isLoading={groupMutation.isPending}>
                  ذخیره
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreatingGroup(false)
                    setEditingGroup(null)
                  }}
                >
                  انصراف
                </Button>
              </div>
            </div>
          )}

          {groupsLoading ? (
            <p>در حال بارگذاری...</p>
          ) : (
            <div className="grid gap-4">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-2xl border border-border dark:border-border-dark bg-card dark:bg-card-dark p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold">{group.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.user_count || 0} کاربر · {group.permissions.length} دسترسی
                      </p>
                      <p className="text-sm mt-2">
                        {(group.permission_labels || [])
                          .map((p) => p.name)
                          .join('، ') || 'بدون دسترسی'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditGroup(group)}>
                        ویرایش
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`حذف گروه ${group.name}؟`)) {
                            deleteGroupMutation.mutate(group.id)
                          }
                        }}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
