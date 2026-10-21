"use client"

import * as React from "react"
import { FileText, Landmark, Plus, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import {
  createBankAccountAction,
  createWordingFormAction,
  toggleBankAccountStatusAction,
  toggleWordingFormStatusAction,
  updateBankAccountAction,
} from "@/app/(app)/master-data/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
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
import type { Currency, LookupValue, WordingForm } from "@/lib/generated/prisma/client"
import type { BankAccountRecord } from "@/lib/server/master-data"

export interface FinanceDocsTabProps {
  initialBankAccounts: BankAccountRecord[]
  initialCurrencies: Currency[]
  initialWordingForms: WordingForm[]
  banks: LookupValue[]
}

export function FinanceDocsTab({
  initialBankAccounts,
  initialCurrencies,
  initialWordingForms,
  banks,
}: FinanceDocsTabProps) {
  const [subTab, setSubTab] = React.useState<"banks" | "currencies" | "wordings">("banks")
  const [bankAccounts, setBankAccounts] = React.useState<BankAccountRecord[]>(initialBankAccounts)
  const [currencies] = React.useState<Currency[]>(initialCurrencies)
  const [wordingForms, setWordingForms] = React.useState<WordingForm[]>(initialWordingForms)
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

  // Modal Wording State
  const [wordingDialogOpen, setWordingDialogOpen] = React.useState(false)
  const [wordingName, setWordingName] = React.useState("")

  React.useEffect(() => {
    setBankAccounts(initialBankAccounts)
  }, [initialBankAccounts])

  React.useEffect(() => {
    setWordingForms(initialWordingForms)
  }, [initialWordingForms])

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

  function handleSaveWording() {
    if (!wordingName.trim()) {
      toast.error("Nama wording form wajib diisi")
      return
    }

    startTransition(async () => {
      const res = await createWordingFormAction({ name: wordingName })
      if (!res.ok || !res.data) {
        toast.error(res.error)
        return
      }
      toast.success("Wording form baru berhasil ditambahkan")
      setWordingForms((prev) => [res.data as WordingForm, ...prev])
      setWordingName("")
      setWordingDialogOpen(false)
    })
  }

  function handleToggleWording(id: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleWordingFormStatusAction(id, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setWordingForms((prev) => prev.map((w) => (w.id === id ? { ...w, isActive: next } : w)))
      toast.success(next ? "Wording form diaktifkan" : "Wording form dinonaktifkan")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={subTab}
          onValueChange={(val) => setSubTab(val as "banks" | "currencies" | "wordings")}
        >
          <TabsList className="h-9">
            <TabsTrigger value="banks" className="gap-1.5 text-xs">
              <Landmark className="size-3.5" />
              Rekening Bank LCH ({bankAccounts.length})
            </TabsTrigger>
            <TabsTrigger value="currencies" className="text-xs">
              Mata Uang ({currencies.length})
            </TabsTrigger>
            <TabsTrigger value="wordings" className="gap-1.5 text-xs">
              <FileText className="size-3.5" />
              Wording Form Polis ({wordingForms.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {subTab === "banks" && (
          <Button size="sm" onClick={openAddBank} className="h-9 gap-1.5 text-xs">
            <Plus className="size-4" />
            Tambah Rekening Bank
          </Button>
        )}

        {subTab === "wordings" && (
          <Button
            size="sm"
            onClick={() => {
              setWordingName("")
              setWordingDialogOpen(true)
            }}
            className="h-9 gap-1.5 text-xs"
          >
            <Plus className="size-4" />
            Tambah Wording Form
          </Button>
        )}
      </div>

      {/* 1. Rekening Bank */}
      {subTab === "banks" && (
        <Card className="gap-0 overflow-hidden py-0">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-36">Bank</TableHead>
                <TableHead className="w-48">Nomor Rekening</TableHead>
                <TableHead>Nama Pemilik Rekening</TableHead>
                <TableHead className="w-24">Valuta</TableHead>
                <TableHead className="w-44">Tipe Rekening</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24 text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.length === 0 ? (
                <TableEmpty colSpan={7} message="Belum ada data rekening bank operasional." />
              ) : (
                bankAccounts.map((acc) => (
                  <TableRow key={acc.id} className="text-xs hover:bg-muted/40 transition-colors">
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
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 gap-1 text-[11px]"
                        >
                          <ShieldAlert className="size-3" />
                          Titipan Premi
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          Operasional
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={acc.isActive ? "Active" : "Inactive"} />
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Switch
                          checked={acc.isActive}
                          onCheckedChange={() => handleToggleBank(acc.id, acc.isActive)}
                          disabled={isPending}
                          className="scale-75"
                          title={acc.isActive ? "Nonaktifkan rekening" : "Aktifkan rekening"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 2. Mata Uang */}
      {subTab === "currencies" && (
        <Card className="gap-0 overflow-hidden py-0">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28">Kode ISO</TableHead>
                <TableHead>Nama Mata Uang</TableHead>
                <TableHead className="w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((curr) => (
                <TableRow key={curr.code} className="text-xs hover:bg-muted/40">
                  <TableCell className="font-mono font-semibold text-foreground">
                    {curr.code}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{curr.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={curr.isActive ? "Active" : "Inactive"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 3. Wording Form */}
      {subTab === "wordings" && (
        <Card className="gap-0 overflow-hidden py-0">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nama Wording Form Baku</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24 text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wordingForms.length === 0 ? (
                <TableEmpty colSpan={3} message="Belum ada data wording form polis baku." />
              ) : (
                wordingForms.map((w) => (
                  <TableRow key={w.id} className="text-xs hover:bg-muted/40">
                    <TableCell className="font-medium text-foreground">{w.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={w.isActive ? "Active" : "Inactive"} />
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end">
                        <Switch
                          checked={w.isActive}
                          onCheckedChange={() => handleToggleWording(w.id, w.isActive)}
                          disabled={isPending}
                          className="scale-75"
                          title={w.isActive ? "Nonaktifkan wording" : "Aktifkan wording"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog Bank Account */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBankAcc ? "Edit Rekening Bank" : "Tambah Rekening Bank"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rekening bank operasional LCH untuk penerimaan premi atau transaksi bisnis.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-select" className="text-xs font-medium">
                Pilih Bank <span className="text-destructive">*</span>
              </Label>
              <Select value={bankId} onValueChange={(val) => setBankId(val ?? "")}>
                <SelectTrigger id="bank-select" className="h-8.5 text-xs">
                  <SelectValue placeholder="Pilih bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-no" className="text-xs font-medium">
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
                className="h-8.5 font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-name" className="text-xs font-medium">
                Nama Pemilik Rekening <span className="text-destructive">*</span>
              </Label>
              <Input
                id="acc-name"
                placeholder="PT LCH Insurance Brokers"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-curr" className="text-xs font-medium">
                Mata Uang <span className="text-destructive">*</span>
              </Label>
              <Select value={currencyCode} onValueChange={(val) => setCurrencyCode(val ?? "IDR")}>
                <SelectTrigger id="acc-curr" className="h-8.5 text-xs">
                  <SelectValue placeholder="Pilih valuta" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-xs">
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex flex-col">
                <span className="text-xs font-medium">Rekening Titipan Premi</span>
                <span className="text-[11px] text-muted-foreground">
                  Pisahkan rekening dana premi nasabah dari rekening operasional
                </span>
              </div>
              <Switch checked={isPremiumTrust} onCheckedChange={setIsPremiumTrust} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-xs font-medium">Status Aktif</span>
              <Switch checked={bankIsActive} onCheckedChange={setBankIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBankDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveBank}
              disabled={isPending}
              className="text-xs"
            >
              {editingBankAcc ? "Simpan Perubahan" : "Simpan Rekening"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Wording Form */}
      <Dialog open={wordingDialogOpen} onOpenChange={setWordingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Wording Form Polis Baku</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan nama format baku polis asuransi (contoh: Polis Standar Asuransi Kendaraan
              Bermotor Indonesia / PSAKBI).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wording-name" className="text-xs font-medium">
                Nama Wording Form <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wording-name"
                placeholder="Contoh: PSAKI (Polis Standar Asuransi Kebakaran Indonesia)"
                value={wordingName}
                onChange={(e) => setWordingName(e.target.value)}
                className="h-8.5 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWordingDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveWording}
              disabled={isPending}
              className="text-xs"
            >
              Simpan Wording Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
