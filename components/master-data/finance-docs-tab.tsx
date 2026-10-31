"use client"

import * as React from "react"
import { Pencil, Plus, Power, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import {
  createBankAccountAction,
  createCurrencyAction,
  toggleBankAccountStatusAction,
  toggleCurrencyStatusAction,
  updateBankAccountAction,
} from "@/app/(app)/master-data/actions"
import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { SearchInput } from "@/components/shared/table-toolbar"
import { usePermission } from "@/components/auth/permission-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Currency, LookupValue } from "@/lib/generated/prisma/client"
import type { BankAccountRecord } from "@/lib/server/master-data"

export interface FinanceDocsTabProps {
  initialBankAccounts: BankAccountRecord[]
  initialCurrencies: Currency[]
  banks: LookupValue[]
}

export function FinanceDocsTab({
  initialBankAccounts,
  initialCurrencies,
  banks,
}: FinanceDocsTabProps) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [subTab, setSubTab] = React.useState<"banks" | "currencies">("banks")
  const [bankAccounts, setBankAccounts] = React.useState<BankAccountRecord[]>(initialBankAccounts)
  const [currencies, setCurrencies] = React.useState<Currency[]>(initialCurrencies)
  const [query, setQuery] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  // Modal Bank State
  const [bankDialogOpen, setBankDialogOpen] = React.useState(false)
  const [editingBankAcc, setEditingBankAcc] = React.useState<BankAccountRecord | null>(null)
  const [bankId, setBankId] = React.useState(banks[0]?.id ?? "")
  const [accountNo, setAccountNo] = React.useState("")
  const [accountName, setAccountName] = React.useState("")
  const [currencyCode, setCurrencyCode] = React.useState("IDR")
  const [isPremiumTrust, setIsPremiumTrust] = React.useState(false)
  const [bankIsActive, setBankIsActive] = React.useState(true)

  // Modal Mata Uang State
  const [currencyDialogOpen, setCurrencyDialogOpen] = React.useState(false)
  const [newCurrencyCode, setNewCurrencyCode] = React.useState("")
  const [newCurrencyName, setNewCurrencyName] = React.useState("")

  const [prevCurrencies, setPrevCurrencies] = React.useState(initialCurrencies)
  if (prevCurrencies !== initialCurrencies) {
    setPrevCurrencies(initialCurrencies)
    setCurrencies(initialCurrencies)
  }

  const [prevBankAccounts, setPrevBankAccounts] = React.useState(initialBankAccounts)
  if (prevBankAccounts !== initialBankAccounts) {
    setPrevBankAccounts(initialBankAccounts)
    setBankAccounts(initialBankAccounts)
  }

  const filteredBanks = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return bankAccounts
    return bankAccounts.filter((acc) =>
      [acc.bank?.name ?? "", acc.accountNo, acc.accountName].some((v) =>
        v.toLowerCase().includes(q)
      )
    )
  }, [bankAccounts, query])

  const filteredCurrencies = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return currencies
    return currencies.filter((c) =>
      [c.code, c.name].some((v) => v.toLowerCase().includes(q))
    )
  }, [currencies, query])

  const bankPaging = usePagination(filteredBanks, 10)
  const currencyPaging = usePagination(filteredCurrencies, 10)

  function openAddBank() {
    setEditingBankAcc(null)
    setBankId(banks[0]?.id ?? "")
    setAccountNo("")
    setAccountName("PT LCH Insurance Brokers")
    setCurrencyCode("IDR")
    setIsPremiumTrust(false)
    setBankIsActive(true)
    setBankDialogOpen(true)
  }

  // Dialog sudah mendukung mode edit, tapi dulu tidak ada tombol yang
  // membukanya. Sekarang dibuka dari menu aksi baris.
  function openEditBank(acc: BankAccountRecord) {
    setEditingBankAcc(acc)
    setBankId(acc.bankId)
    setAccountNo(acc.accountNo)
    setAccountName(acc.accountName)
    setCurrencyCode(acc.currencyCode)
    setIsPremiumTrust(acc.isPremiumTrust)
    setBankIsActive(acc.isActive)
    setBankDialogOpen(true)
  }

  function openAddCurrency() {
    setNewCurrencyCode("")
    setNewCurrencyName("")
    setCurrencyDialogOpen(true)
  }

  function handleSaveBank() {
    if (!accountNo.trim() || !accountName.trim()) {
      toast.error("Nomor rekening dan nama akun wajib diisi")
      return
    }

    startTransition(async () => {
      if (editingBankAcc) {
        const res = await updateBankAccountAction(editingBankAcc.id, {
          bankId,
          accountNo,
          accountName,
          currencyCode,
          isPremiumTrust,
          isActive: bankIsActive,
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success("Rekening bank berhasil diperbarui")
        setBankAccounts((prev) =>
          prev.map((b) =>
            b.id === editingBankAcc.id
              ? {
                  ...b,
                  bankId,
                  accountNo,
                  accountName,
                  currencyCode,
                  isPremiumTrust,
                  isActive: bankIsActive,
                  bank: banks.find((item) => item.id === bankId) ?? b.bank,
                }
              : b
          )
        )
      } else {
        const res = await createBankAccountAction({
          bankId,
          accountNo,
          accountName,
          currencyCode,
          isPremiumTrust,
          isActive: bankIsActive,
        })
        if (!res.ok || !res.data) {
          toast.error(res.error)
          return
        }
        toast.success("Rekening bank berhasil ditambahkan")
        const selectedBank = banks.find((b) => b.id === bankId)!
        const newRecord: BankAccountRecord = {
          ...(res.data as BankAccountRecord),
          bank: selectedBank,
          currency: currencies.find((c) => c.code === currencyCode)!,
        }
        setBankAccounts((prev) => [newRecord, ...prev])
      }
      setBankDialogOpen(false)
    })
  }

  function handleToggleBank(id: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleBankAccountStatusAction(id, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setBankAccounts((prev) => prev.map((b) => (b.id === id ? { ...b, isActive: next } : b)))
      toast.success(next ? "Rekening diaktifkan" : "Rekening dinonaktifkan")
    })
  }

  function handleSaveCurrency() {
    if (!newCurrencyCode.trim() || !newCurrencyName.trim()) {
      toast.error("Kode dan nama mata uang wajib diisi")
      return
    }

    startTransition(async () => {
      const res = await createCurrencyAction({
        code: newCurrencyCode,
        name: newCurrencyName,
      })
      if (!res.ok || !res.data) {
        toast.error(res.error)
        return
      }
      const created = res.data
      toast.success(`Mata uang ${created.code} berhasil ditambahkan`)
      setCurrencies((prev) =>
        [...prev, created].sort((a, b) => a.code.localeCompare(b.code))
      )
      setCurrencyDialogOpen(false)
    })
  }

  function handleToggleCurrency(code: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleCurrencyStatusAction(code, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setCurrencies((prev) =>
        prev.map((c) => (c.code === code ? { ...c, isActive: next } : c))
      )
      toast.success(next ? `${code} diaktifkan` : `${code} dinonaktifkan`)
    })
  }

  function bankActions(acc: BankAccountRecord): RowAction[] {
    return [
      { label: "Edit rekening", icon: Pencil, onSelect: () => openEditBank(acc) },
      {
        label: acc.isActive ? "Nonaktifkan" : "Aktifkan",
        icon: Power,
        disabled: isPending,
        onSelect: () => handleToggleBank(acc.id, acc.isActive),
      },
    ]
  }

  function currencyActions(curr: Currency): RowAction[] {
    return [
      {
        label: curr.isActive ? "Nonaktifkan" : "Aktifkan",
        icon: Power,
        disabled: isPending,
        onSelect: () => handleToggleCurrency(curr.code, curr.isActive),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={subTab}
        onValueChange={(val) => setSubTab(val as "banks" | "currencies")}
      >
        <TabsList>
          <TabsTrigger value="banks">Rekening Bank LCH ({bankAccounts.length})</TabsTrigger>
          <TabsTrigger value="currencies">Mata Uang ({currencies.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder={
            subTab === "banks" ? "Cari bank, nomor, atau nama rekening…" : "Cari kode atau nama mata uang…"
          }
        />

        {canManage && (
          <Button onClick={subTab === "banks" ? openAddBank : openAddCurrency}>
            <Plus data-icon="inline-start" />
            {subTab === "banks" ? "Tambah Rekening Bank" : "Tambah Mata Uang"}
          </Button>
        )}
      </div>

      {subTab === "banks" && (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <Table className="min-w-200">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {canManage && <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>}
                  <TableHead className="w-36">Bank</TableHead>
                  <TableHead className="w-48">Nomor Rekening</TableHead>
                  <TableHead>Nama Pemilik Rekening</TableHead>
                  <TableHead className="w-24">Valuta</TableHead>
                  <TableHead className="w-44">Tipe Rekening</TableHead>
                  <TableHead className="w-24 pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBanks.length === 0 ? (
                  <TableEmpty
                    colSpan={canManage ? 7 : 6}
                    message={
                      query
                        ? "Tidak ada rekening yang cocok dengan pencarian."
                        : "Belum ada data rekening bank operasional."
                    }
                  />
                ) : (
                  bankPaging.paginatedItems.map((acc) => (
                    <TableRow key={acc.id}>
                      {canManage && (
                        <TableCell className={ACTION_COL_CLASS}>
                          <RowActions actions={bankActions(acc)} />
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-foreground">
                        {acc.bank?.name ?? "Bank"}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-foreground">
                        {acc.accountNo}
                      </TableCell>
                      <TableCell>{acc.accountName}</TableCell>
                      <TableCell className="font-mono">{acc.currencyCode}</TableCell>
                      <TableCell>
                        {acc.isPremiumTrust ? (
                          <ToneBadge tone="warning">
                            <ShieldAlert className="size-3" />
                            Titipan Premi
                          </ToneBadge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Operasional
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-4">
                        <StatusBadge status={acc.isActive ? "Active" : "Inactive"} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          <TablePagination
            page={bankPaging.page}
            pageSize={bankPaging.pageSize}
            totalItems={bankPaging.totalItems}
            onPageChange={bankPaging.setPage}
            onPageSizeChange={bankPaging.setPageSize}
            itemName="rekening"
          />
        </>
      )}

      {subTab === "currencies" && (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <Table className="min-w-160">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {canManage && <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>}
                  <TableHead className="w-28">Kode ISO</TableHead>
                  <TableHead>Nama Mata Uang</TableHead>
                  <TableHead className="w-28 pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCurrencies.length === 0 ? (
                  <TableEmpty
                    colSpan={canManage ? 4 : 3}
                    message="Tidak ada mata uang yang cocok dengan pencarian."
                  />
                ) : (
                  currencyPaging.paginatedItems.map((curr) => (
                    <TableRow key={curr.code}>
                      {canManage && (
                        <TableCell className={ACTION_COL_CLASS}>
                          <RowActions actions={currencyActions(curr)} />
                        </TableCell>
                      )}
                      <TableCell className="font-mono font-semibold text-foreground">
                        {curr.code}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{curr.name}</TableCell>
                      <TableCell className="pr-4">
                        <StatusBadge status={curr.isActive ? "Active" : "Inactive"} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          <TablePagination
            page={currencyPaging.page}
            pageSize={currencyPaging.pageSize}
            totalItems={currencyPaging.totalItems}
            onPageChange={currencyPaging.setPage}
            onPageSizeChange={currencyPaging.setPageSize}
            itemName="mata uang"
          />
        </>
      )}

      {/* Dialog Bank Account */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBankAcc ? "Edit Rekening Bank" : "Tambah Rekening Bank"}
            </DialogTitle>
            <DialogDescription>
              Rekening bank operasional LCH untuk penerimaan premi atau transaksi bisnis.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-select">
                Pilih Bank <span className="text-destructive">*</span>
              </Label>
              <Select
                items={banks.map((b) => ({ label: b.name, value: b.id }))}
                value={bankId}
                onValueChange={(val) => setBankId(val ?? "")}
              >
                <SelectTrigger id="bank-select" className="w-full">
                  <SelectValue placeholder="Pilih bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-no">
                Nomor Rekening <span className="text-destructive">*</span>
              </Label>
              <Input
                id="acc-no"
                placeholder="Contoh: 123-00-9876543-1"
                value={accountNo}
                inputMode="numeric"
                maxLength={30}
                onChange={(e) =>
                  setAccountNo(e.target.value.replace(/[^0-9-]/g, ""))
                }
                className="font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-name">
                Nama Pemilik Rekening <span className="text-destructive">*</span>
              </Label>
              <Input
                id="acc-name"
                placeholder="PT LCH Insurance Brokers"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-curr">
                Mata Uang <span className="text-destructive">*</span>
              </Label>
              <Select value={currencyCode} onValueChange={(val) => setCurrencyCode(val ?? "IDR")}>
                <SelectTrigger id="acc-curr" className="w-full">
                  <SelectValue placeholder="Pilih valuta" />
                </SelectTrigger>
                <SelectContent>
                  {currencies
                    .filter((c) => c.isActive || c.code === currencyCode)
                    .map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Rekening Titipan Premi</span>
                <span className="text-[11px] text-muted-foreground">
                  Pisahkan rekening dana premi nasabah dari rekening operasional
                </span>
              </div>
              <Switch checked={isPremiumTrust} onCheckedChange={setIsPremiumTrust} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-sm font-medium">Status Aktif</span>
              <Switch checked={bankIsActive} onCheckedChange={setBankIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBankDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveBank}
              disabled={isPending}
            >
              {editingBankAcc ? "Simpan Perubahan" : "Simpan Rekening"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Mata Uang */}
      <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Mata Uang</DialogTitle>
            <DialogDescription>
              Kode ISO 4217 tiga huruf menjadi kunci dan tidak bisa diubah.
              Mata uang yang tidak dipakai lagi cukup dinonaktifkan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency-code">
                Kode ISO <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-code"
                placeholder="Contoh: JPY"
                value={newCurrencyCode}
                onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                maxLength={3}
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency-name">
                Nama Mata Uang <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-name"
                placeholder="Contoh: Japanese Yen"
                value={newCurrencyName}
                onChange={(e) => setNewCurrencyName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrencyDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCurrency}
              disabled={isPending}
            >
              Simpan Mata Uang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
