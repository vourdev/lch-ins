import type { LucideIcon } from "lucide-react"
import {
  BookOpenText,
  Calculator,
  ChartColumn,
  Database,
  FileText,
  History,
  LayoutDashboard,
  Landmark,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  /** Modul yang belum dikerjakan, ditandai di sidebar. */
  soon?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Ringkasan",
    items: [{ title: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Operasional",
    items: [
      { title: "Marketing", href: "/marketing", icon: Users },
      { title: "Underwriting", href: "/underwriting", icon: FileText },
      { title: "Policy Database", href: "/policies", icon: ShieldCheck },
      { title: "Klaim", href: "/claims", icon: TriangleAlert },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Debit & Credit Note",
        href: "/finance/notes",
        icon: Receipt,
        soon: true,
      },
      {
        title: "Pembayaran",
        href: "/finance/payments",
        icon: Wallet,
        soon: true,
      },
      {
        title: "Piutang & Hutang Premi",
        href: "/finance/receivables",
        icon: Landmark,
        soon: true,
      },
    ],
  },
  {
    label: "Akuntansi",
    items: [
      {
        title: "Jurnal",
        href: "/accounting/journal",
        icon: ScrollText,
        soon: true,
      },
      {
        title: "Laporan Keuangan",
        href: "/accounting/statements",
        icon: Calculator,
        soon: true,
      },
    ],
  },
  {
    label: "Referensi & Laporan",
    items: [
      {
        title: "Master Clauses",
        href: "/underwriting/master-clauses",
        icon: BookOpenText,
      },
      {
        title: "Master Data",
        href: "/master-data",
        icon: Database,
        soon: true,
      },
      { title: "Report", href: "/reports", icon: ChartColumn },
    ],
  },
  {
    label: "Sistem",
    items: [
      { title: "Pengguna", href: "/users", icon: UserCog },
      { title: "Audit Trail", href: "/audit-trail", icon: History },
      { title: "Pengaturan", href: "/settings", icon: Settings, soon: true },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)
