"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"

import logoMark from "@/public/images/logo-lch-mark.png"
import { NAV_GROUPS } from "@/components/layout/nav-items"
import { canAccess } from "@/lib/access"
import { signOut } from "@/lib/auth-client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  if (href === "/underwriting") {
    return (
      pathname.startsWith("/underwriting") &&
      !pathname.startsWith("/underwriting/master-clauses")
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({
  roleCode,
  roles,
}: {
  roleCode?: string
  roles?: string[]
}) {
  const userRoles =
    roles && roles.length > 0 ? roles : roleCode ? [roleCode] : []

  // Menu yang tidak boleh dibuka role ini tidak ditampilkan. Ini kenyamanan,
  // bukan pengaman: penjagaan yang sebenarnya ada di lib/server/session.ts.
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(userRoles, item.href)),
  })).filter((group) => group.items.length > 0)

  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-14 justify-center border-b px-4 group-data-[collapsible=icon]:px-2">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          {/* Tile putih tetap dipakai di tema gelap karena latar emblem putih. */}
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-sidebar-border">
            <Image src={logoMark} alt="" className="size-full" loading="eager" />
          </span>
          <span className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[13px] font-semibold text-sidebar-accent-foreground">
              PT. LCH
            </span>
            <span className="truncate text-[10px] tracking-[0.12em]">
              INSURANCE BROKERS
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="gap-1 px-0 py-1.5">
            <SidebarGroupLabel className="h-6 px-3 text-[10px] font-semibold tracking-[0.09em] uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive(pathname, item.href)}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span className="truncate">{item.title}</span>
                      {item.soon ? (
                        <span
                          title="Modul belum dikerjakan"
                          className="ml-auto shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium tracking-wide text-muted-foreground"
                        >
                          SOON
                        </span>
                      ) : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Keluar"
              onClick={async () => {
                try {
                  await signOut()
                } finally {
                  window.location.replace("/login")
                }
              }}
            >
              <LogOut />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
