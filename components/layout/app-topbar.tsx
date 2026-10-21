"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, LogOut } from "lucide-react"

import { CommandMenu } from "@/components/layout/command-menu"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ROLE_LABELS, type RoleCode } from "@/lib/access"
import { signOut } from "@/lib/auth-client"
import type { CurrentUser } from "@/lib/server/session"

const SEGMENT_LABELS: Record<string, string> = {
  marketing: "Marketing",
  underwriting: "Underwriting",
  policies: "Policy Database",
  claims: "Klaim",
  reports: "Report",
  "master-clauses": "Master Clauses",
  finance: "Finance",
  notes: "Debit & Credit Note",
  payments: "Pembayaran",
  receivables: "Piutang & Hutang Premi",
  accounting: "Akuntansi",
  journal: "Jurnal",
  statements: "Laporan Keuangan",
  "master-data": "Master Data",
  users: "Pengguna",
  "audit-trail": "Audit Trail",
  settings: "Pengaturan",
  new: "Baru",
  edit: "Edit",
  quotation: "Quotation Slip",
  "cover-note": "Cover Note",
  closing: "Closing Instruction",
  slip: "Placing Slip",
  clients: "Detail Klien",
  "change-password": "Ganti Kata Sandi",
}

/**
 * Routes that have their own page. Intermediate segments like
 * `/underwriting/quotation` or `/finance` are not linked to prevent
 * breadcrumbs from navigating to 404 pages.
 */
const PAGES = new Set([
  "/marketing",
  "/underwriting",
  "/underwriting/new",
  "/underwriting/master-clauses",
  "/underwriting/master-clauses/new",
  "/policies",
  "/claims",
  "/reports",
  "/finance/notes",
  "/finance/payments",
  "/finance/receivables",
  "/accounting/journal",
  "/accounting/statements",
  "/master-data",
  "/users",
  "/audit-trail",
  "/settings",
  "/change-password",
])

function buildCrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string; linkable: boolean }[] = []
  let href = ""
  for (const segment of segments) {
    href += `/${segment}`
    const label = SEGMENT_LABELS[segment]
    if (!label) continue
    crumbs.push({ label, href, linkable: PAGES.has(href) })
  }
  return crumbs
}

function getInitials(name?: string | null): string {
  if (!name) return "U"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "U"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AppTopbar({ user }: { user?: CurrentUser | null }) {
  const pathname = usePathname()
  const isChangePassword = pathname === "/change-password"
  const crumbs = isChangePassword ? [] : buildCrumbs(pathname)

  const initials = getInitials(user?.name)
  const assignedRoles = user?.roles ?? (user?.roleCode ? [user.roleCode] : [])
  const roleLabels = assignedRoles.map(
    (code) => ROLE_LABELS[code as RoleCode] ?? code
  )

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm md:rounded-t-2xl">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            {crumbs.length === 0 ? (
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            ) : isChangePassword ? (
              <span className="text-muted-foreground text-xs sm:text-sm">
                Dashboard
              </span>
            ) : (
              <BreadcrumbLink render={<Link href="/" />}>
                Dashboard
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem className="max-md:hidden">
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : !crumb.linkable || isChangePassword ? (
                  <span className="text-muted-foreground">{crumb.label}</span>
                ) : (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <CommandMenu />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Notifikasi"
          className="relative"
        >
          <Bell />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        </Button>
        <ThemeToggle />
        <Separator orientation="vertical" className="mx-1 h-4" />

        {/* User Identity & Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-md p-1 outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-label="Menu akun pengguna"
          >
            <Avatar className="size-7 rounded-md">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {user?.name ? (
              <span className="hidden max-w-[130px] truncate text-xs font-medium text-foreground sm:inline-block">
                {user.name}
              </span>
            ) : null}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60 p-2">
            <DropdownMenuGroup className="px-2 py-1.5">
              <div className="flex items-center gap-2">
                <Avatar className="size-8 rounded-md">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {user?.name || "Pengguna"}
                  </p>
                  {user?.email ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {user.email}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Roles Badge List */}
              <div className="mt-2.5 flex flex-wrap gap-1">
                {roleLabels.length > 0 ? (
                  roleLabels.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    Belum ada peran
                  </span>
                )}
              </div>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={async () => {
                try {
                  await signOut()
                } finally {
                  window.location.replace("/login")
                }
              }}
            >
              <LogOut className="size-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
