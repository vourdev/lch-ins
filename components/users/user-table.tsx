"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  KeyRound,
  Pencil,
  Power,
  PowerOff,
  ShieldAlert,
  UserCheck,
  UserMinus,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

import {
  RowActions,
  type RowAction,
  ACTION_COL_CLASS,
} from "@/components/shared/row-actions"
import { SearchInput } from "@/components/shared/table-toolbar"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CANONICAL_ROLES, type RoleCode } from "@/lib/access"
import { dateShort } from "@/lib/format"
import type { UserSummary } from "@/lib/server/users"
import {
  resetUserPasswordAction,
  toggleUserStatusAction,
} from "@/app/(app)/users/actions"
import { UserRoleBadge } from "./user-role-badge"
import { UserFormDialog } from "./user-form-dialog"
import { TemporaryPasswordDialog } from "./temporary-password-dialog"

const ROLE_FILTER_ITEMS = [
  { label: "Semua Peran", value: "all" },
  ...CANONICAL_ROLES.map((r) => ({ label: r.label, value: r.code })),
]

const STATUS_FILTER_ITEMS = [
  { label: "Semua Status", value: "all" },
  { label: "Aktif", value: "active" },
  { label: "Nonaktif", value: "inactive" },
]

export function UserTable({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserSummary[]
  currentUserId: string
}) {
  const router = useRouter()
  const users = initialUsers
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")

  // Dialog states
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<UserSummary | null>(null)

  const [tempPasswordModal, setTempPasswordModal] = React.useState<{
    open: boolean
    email: string
    password: string | null
    title?: string
  }>({
    open: false,
    email: "",
    password: null,
  })

  // Client-side filter logic
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesName = u.name.toLowerCase().includes(q)
        const matchesEmail = u.email.toLowerCase().includes(q)
        const matchesJob = u.jobTitle?.toLowerCase().includes(q)
        if (!matchesName && !matchesEmail && !matchesJob) return false
      }

      if (roleFilter !== "all") {
        if (!u.roles.includes(roleFilter as RoleCode)) return false
      }

      if (statusFilter !== "all") {
        const wantActive = statusFilter === "active"
        if (u.isActive !== wantActive) return false
      }

      return true
    })
  }, [users, search, roleFilter, statusFilter])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedUsers,
    setPage,
    setPageSize,
  } = usePagination(filteredUsers, 10)

  function handleCreateClick() {
    setEditingUser(null)
    setFormOpen(true)
  }

  function handleEditClick(user: UserSummary) {
    setEditingUser(user)
    setFormOpen(true)
  }

  async function handleToggleStatus(user: UserSummary) {
    const nextStatus = !user.isActive
    const actionLabel = nextStatus ? "mengaktifkan" : "menonaktifkan"

    try {
      const res = await toggleUserStatusAction(user.id, nextStatus)
      if (!res.ok || !res.data) {
        toast.error(res.error ?? `Gagal ${actionLabel} pengguna.`)
        return
      }

      toast.success(
        `Pengguna ${user.name} berhasil ${nextStatus ? "diaktifkan" : "dinonaktifkan"}.`
      )
      router.refresh()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : `Gagal ${actionLabel} pengguna.`
      toast.error(msg)
    }
  }

  async function handleResetPassword(user: UserSummary) {
    try {
      const res = await resetUserPasswordAction(user.id)
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "Gagal mereset kata sandi.")
        return
      }

      setTempPasswordModal({
        open: true,
        email: user.email,
        password: res.data.temporaryPassword,
        title: "Kata Sandi Berhasil Direset",
      })
      toast.success("Kata sandi berhasil direset ke kata sandi sementara.")
      router.refresh()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal mereset kata sandi pengguna."
      toast.error(msg)
    }
  }

  function getRowActions(user: UserSummary): RowAction[] {
    const isSelf = user.id === currentUserId
    const actions: RowAction[] = [
      {
        label: "Edit Pengguna",
        icon: Pencil,
        onSelect: () => handleEditClick(user),
      },
      {
        label: "Reset Kata Sandi",
        icon: KeyRound,
        confirm: {
          title: `Reset kata sandi ${user.name}?`,
          description:
            "Sistem akan membuat kata sandi sementara baru, mencabut seluruh sesi aktif pengguna, dan mewajibkan pengguna mengganti kata sandi saat pertama kali masuk.",
          actionLabel: "Reset Kata Sandi",
        },
        onSelect: () => handleResetPassword(user),
      },
    ]

    if (user.isActive) {
      actions.push({
        label: "Nonaktifkan Pengguna",
        icon: PowerOff,
        destructive: true,
        disabled: isSelf,
        confirm: {
          title: `Nonaktifkan akun ${user.name}?`,
          description:
            "Pengguna tidak akan dapat masuk ke sistem dan seluruh sesi aktifnya akan langsung dicabut seketika.",
          actionLabel: "Nonaktifkan",
        },
        onSelect: () => handleToggleStatus(user),
      })
    } else {
      actions.push({
        label: "Aktifkan Pengguna",
        icon: Power,
        onSelect: () => handleToggleStatus(user),
      })
    }

    return actions
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search and filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Cari nama, email, jabatan…"
          />

          <Select
            items={ROLE_FILTER_ITEMS}
            value={roleFilter}
            onValueChange={(val) => setRoleFilter(val as string)}
          >
            <SelectTrigger size="sm" className="w-40" aria-label="Filter Peran">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ROLE_FILTER_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            items={STATUS_FILTER_ITEMS}
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as string)}
          >
            <SelectTrigger
              size="sm"
              className="w-36"
              aria-label="Filter Status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STATUS_FILTER_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreateClick} className="gap-1.5">
          <UserPlus className="size-4" />
          Tambah Pengguna
        </Button>
      </div>

      {/* User data table */}
      <Card className="gap-0 overflow-hidden py-0 border">
        <Table className="min-w-190">
          <TableHeader>
            <TableRow>
              <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Keamanan</TableHead>
              <TableHead>Terdaftar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message={
                  search || roleFilter !== "all" || statusFilter !== "all"
                    ? "Tidak ada pengguna yang sesuai dengan filter pencarian"
                    : "Belum ada data pengguna"
                }
              />
            ) : (
              paginatedUsers.map((u) => {
                const isSelf = u.id === currentUserId
                return (
                  <TableRow key={u.id}>
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions actions={getRowActions(u)} />
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          {u.name}
                          {isSelf && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                              Anda
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {u.email}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-foreground">
                        {u.jobTitle || "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.roles.length > 0 ? (
                          u.roles.map((r) => (
                            <UserRoleBadge key={r} role={r} />
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Tanpa peran
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          <UserCheck className="size-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          <UserMinus className="size-3" />
                          Nonaktif
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {u.mustChangePassword ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                          <ShieldAlert className="size-3 text-amber-600 dark:text-amber-400" />
                          Wajib Ganti Sandi
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Normal
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {dateShort(u.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemName="pengguna"
      />

      {/* Create / Edit modal dialog */}
      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        currentUserId={currentUserId}
        onSuccess={({ user: newUser, temporaryPassword }) => {
          if (temporaryPassword && editingUser === null) {
            setTempPasswordModal({
              open: true,
              email: newUser.email,
              password: temporaryPassword,
              title: "Pengguna Baru Dibuat",
            })
          }
          router.refresh()
        }}
      />

      {/* Temporary password modal dialog */}
      <TemporaryPasswordDialog
        open={tempPasswordModal.open}
        onOpenChange={(open) =>
          setTempPasswordModal((prev) => ({ ...prev, open }))
        }
        email={tempPasswordModal.email}
        temporaryPassword={tempPasswordModal.password}
        title={tempPasswordModal.title}
      />
    </div>
  )
}
