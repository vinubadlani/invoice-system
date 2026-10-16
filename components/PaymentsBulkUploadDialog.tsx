"use client"

import { useState } from "react"
import Papa from "papaparse"
import { insertData } from "@/lib/supabase"
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface PaymentsBulkUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  parties: any[]
  payments: any[]
  onUploadComplete: () => void
}

interface ReviewRow {
  id: string
  edited: Record<string, string>
  errors: string[]
  warnings: string[]
}

const COLUMNS = ["date", "party_name", "type", "amount", "mode", "invoice_no", "remarks"] as const
const MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card"]

// Accept the header spellings people commonly use and map them onto the canonical columns.
const HEADER_ALIASES: Record<string, string> = {
  payment_date: "date",
  party: "party_name",
  partyname: "party_name",
  customer: "party_name",
  supplier: "party_name",
  payment_type: "type",
  payment_mode: "mode",
  payment_method: "mode",
  invoice_number: "invoice_no",
  invoice: "invoice_no",
  note: "remarks",
  notes: "remarks",
  narration: "remarks",
}

const normalizeType = (v: string) => {
  const t = (v || "").trim().toLowerCase()
  if (["received", "receipt", "in", "credit", "receive"].includes(t)) return "Received"
  if (["paid", "payment", "out", "debit", "pay"].includes(t)) return "Paid"
  return ""
}

const normalizeMode = (v: string) => {
  const t = (v || "").trim().toLowerCase().replace(/[\s_-]+/g, "")
  if (!t) return "Cash"
  return (
    MODES.find((m) => m.toLowerCase().replace(/[\s_-]+/g, "") === t) ||
    (["neft", "rtgs", "imps", "banktransfer", "bank"].includes(t) ? "Bank Transfer" : "")
  )
}

// Accepts YYYY-MM-DD and DD-MM-YYYY / DD/MM/YYYY (the common Indian spreadsheet format).
const normalizeDate = (v: string) => {
  const s = (v || "").trim()
  if (!s) return ""
  let y: number, m: number, d: number
  let match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (match) {
    ;[y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else if ((match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) {
    ;[d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else {
    return ""
  }
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return ""
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export default function PaymentsBulkUploadDialog({
  open,
  onOpenChange,
  businessId,
  parties,
  payments,
  onUploadComplete,
}: PaymentsBulkUploadDialogProps) {
  const [step, setStep] = useState<"upload" | "review" | "processing" | "results">("upload")
  const [uploading, setUploading] = useState(false)
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ imported: number; failed: Array<{ row: number; error: string; party: string }> } | null>(null)
  const { toast } = useToast()

  const reset = () => {
    setStep("upload")
    setRows([])
    setProgress(0)
    setResults(null)
  }

  const downloadTemplate = () => {
    const csv =
      "date,party_name,type,amount,mode,invoice_no,remarks\n" +
      "2024-01-15,ABC Company,Received,5000,UPI,SI001,Part payment\n" +
      "2024-01-16,XYZ Supplies,Paid,12000,Bank Transfer,PI014,Settled in full\n" +
      "2024-01-17,ABC Company,Received,1500,Cash,,Advance\n"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "payments_bulk_upload_template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Validates one row against the canonical (already-normalised) values; also used after inline edits.
  const validate = (r: Record<string, string>, allRows: Record<string, string>[], selfIndex: number) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (!normalizeDate(r.date)) errors.push("Valid date required (YYYY-MM-DD or DD-MM-YYYY)")
    if (!r.party_name?.trim()) errors.push("Party name is required")
    if (!normalizeType(r.type)) errors.push("Type must be Received or Paid")
    const amt = Number(r.amount)
    if (!r.amount || isNaN(amt) || amt <= 0) errors.push("Amount must be a positive number")
    if (!normalizeMode(r.mode)) errors.push(`Mode must be one of: ${MODES.join(", ")}`)

    if (r.party_name?.trim() && !parties.some((p) => (p.name || "").trim().toLowerCase() === r.party_name.trim().toLowerCase())) {
      warnings.push(`Party "${r.party_name}" not found in your parties - payment will still be recorded under this name`)
    }

    const key = (x: Record<string, string>) =>
      [normalizeDate(x.date), (x.party_name || "").trim().toLowerCase(), normalizeType(x.type), Number(x.amount).toFixed(2), (x.invoice_no || "").trim().toLowerCase()].join("|")
    const myKey = key(r)
    if (!errors.length) {
      if (payments.some((p) => key({ date: String(p.date).slice(0, 10), party_name: p.party_name, type: p.type, amount: String(p.amount), invoice_no: p.invoice_no || "" }) === myKey)) {
        warnings.push("Looks like a duplicate of an existing payment (same date, party, type, amount, invoice)")
      }
      if (allRows.some((x, i) => i < selfIndex && key(x) === myKey)) {
        warnings.push("Duplicate of an earlier row in this file")
      }
    }
    return { errors, warnings }
  }

  const buildRows = (data: Record<string, string>[]): ReviewRow[] => {
    const cleaned = data.map((d) => ({
      date: normalizeDate(d.date) || d.date || "",
      party_name: (d.party_name || "").trim(),
      type: normalizeType(d.type) || d.type || "",
      amount: d.amount || "",
      mode: normalizeMode(d.mode) || d.mode || "",
      invoice_no: (d.invoice_no || "").trim(),
      remarks: (d.remarks || "").trim(),
    }))
    return cleaned.map((c, i) => ({ id: `row-${i}`, edited: c, ...validate(c, cleaned, i) }))
  }

  const handleFile = async (file: File) => {
    if (!businessId) {
      toast({ title: "Error", description: "Please select a business before uploading.", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => {
          const k = h.trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, "_")
          return HEADER_ALIASES[k] || k
        },
        transform: (v: string) => v.trim().replace(/^['"]|['"]$/g, ""),
      })
      if (parsed.errors.length > 0) {
        toast({
          title: "CSV Parsing Errors",
          description: parsed.errors.slice(0, 5).map((e) => `Row ${e.row ?? "?"}: ${e.message}`).join("\n"),
          variant: "destructive",
        })
        return
      }
      const data = parsed.data as Record<string, string>[]
      if (data.length === 0) {
        toast({ title: "Error", description: "CSV file has no data rows.", variant: "destructive" })
        return
      }
      const fields = parsed.meta.fields || []
      const missing = ["date", "party_name", "type", "amount"].filter((c) => !fields.includes(c))
      if (missing.length) {
        toast({ title: "Missing columns", description: `Required column(s) not found: ${missing.join(", ")}. Download the template for the expected format.`, variant: "destructive" })
        return
      }
      setRows(buildRows(data))
      setStep("review")
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to process file: ${e.message}`, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const editCell = (rowId: string, field: string, value: string) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === rowId ? { ...r, edited: { ...r.edited, [field]: value } } : r))
      const all = next.map((r) => r.edited)
      return next.map((r, i) => ({ ...r, ...validate(r.edited, all, i) }))
    })
  }

  const removeRow = (rowId: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== rowId)
      const all = next.map((r) => r.edited)
      return next.map((r, i) => ({ ...r, ...validate(r.edited, all, i) }))
    })
  }

  const validRows = rows.filter((r) => r.errors.length === 0)

  const handleImport = async () => {
    if (validRows.length === 0) return
    setStep("processing")
    setProgress(0)
    const failed: Array<{ row: number; error: string; party: string }> = []
    let imported = 0

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i].edited
      const rowNo = rows.findIndex((x) => x.id === validRows[i].id) + 1
      try {
        const res = await insertData("payments", {
          business_id: businessId,
          date: normalizeDate(r.date),
          party_name: r.party_name.trim(),
          type: normalizeType(r.type),
          amount: Number(r.amount),
          mode: normalizeMode(r.mode),
          invoice_no: r.invoice_no || null,
          remarks: r.remarks || null,
        })
        if (res.error) throw res.error
        imported++
      } catch (e: any) {
        failed.push({ row: rowNo, error: e?.message || "Unknown error", party: r.party_name })
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100))
    }

    setResults({ imported, failed })
    setStep("results")
    if (imported > 0) onUploadComplete()
  }

  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) reset()
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Payments
            {step !== "upload" && (
              <Badge variant="outline">
                {step === "review" && "Review Data"}
                {step === "processing" && "Processing"}
                {step === "results" && "Import Results"}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
          {step === "upload" && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Download the template and fill one payment per row</li>
                  <li>• <strong>type</strong> is <em>Received</em> (from customers) or <em>Paid</em> (to suppliers)</li>
                  <li>• <strong>mode</strong>: {MODES.join(", ")} (defaults to Cash)</li>
                  <li>• <strong>date</strong>: YYYY-MM-DD or DD-MM-YYYY; <strong>invoice_no</strong> and <strong>remarks</strong> are optional</li>
                  <li>• Possible duplicates of existing payments are flagged during review</li>
                  <li>• Uploading records payments only; invoice balances are not changed</li>
                </ul>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Download Template</h3>
                <Button onClick={downloadTemplate} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Payments Template
                </Button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="paymentsBulkFileInput"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                    e.target.value = ""
                  }}
                />
                <label htmlFor="paymentsBulkFileInput">
                  <Button asChild disabled={uploading}>
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Select CSV File
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{rows.length}</div><div className="text-sm text-gray-500">Total Rows</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{validRows.length}</div><div className="text-sm text-gray-500">Ready</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold text-yellow-600">{rows.filter((r) => r.errors.length === 0 && r.warnings.length > 0).length}</div><div className="text-sm text-gray-500">Warnings</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold text-red-600">{rows.filter((r) => r.errors.length > 0).length}</div><div className="text-sm text-gray-500">Errors (skipped)</div></CardContent></Card>
              </div>

              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      {COLUMNS.map((c) => (
                        <TableHead key={c} className="min-w-[130px] capitalize">{c.replace(/_/g, " ")}</TableHead>
                      ))}
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={row.id} className={row.errors.length ? "bg-red-50" : row.warnings.length ? "bg-yellow-50" : "bg-green-50"}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          {row.errors.length ? (
                            <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Error</Badge>
                          ) : row.warnings.length ? (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />Warning</Badge>
                          ) : (
                            <Badge className="text-xs bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Valid</Badge>
                          )}
                        </TableCell>
                        {COLUMNS.map((c) => (
                          <TableCell key={c} className="align-top">
                            <Input
                              value={row.edited[c] || ""}
                              onChange={(e) => editCell(row.id, c, e.target.value)}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeRow(row.id)} title="Remove row">
                            <XCircle className="h-3.5 w-3.5 text-gray-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {rows.some((r) => r.errors.length || r.warnings.length) && (
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto text-xs space-y-1">
                  {rows.map((r, i) => [
                    ...r.errors.map((e, k) => <div key={`${r.id}-e${k}`} className="text-red-600">Row {i + 1}: ❌ {e}</div>),
                    ...r.warnings.map((w, k) => <div key={`${r.id}-w${k}`} className="text-yellow-700">Row {i + 1}: ⚠️ {w}</div>),
                  ])}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={reset}>Back to Upload</Button>
                <Button onClick={handleImport} disabled={validRows.length === 0} className="bg-green-600 hover:bg-green-700">
                  Import {validRows.length} Payment{validRows.length === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="space-y-6 text-center py-6">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
              <div>
                <h3 className="text-lg font-medium">Importing Payments</h3>
                <p className="text-sm text-gray-500">Please wait while we record your payments...</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="font-medium">Progress</span><span className="text-gray-500">{progress}%</span></div>
                <Progress value={progress} className="w-full" />
              </div>
            </div>
          )}

          {step === "results" && results && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  {results.failed.length === 0 ? <CheckCircle className="h-8 w-8 text-green-600" /> : <AlertCircle className="h-8 w-8 text-yellow-600" />}
                </div>
                <h3 className="text-lg font-medium">Import Results</h3>
                <p className="text-sm text-gray-500">{results.imported} of {results.imported + results.failed.length} payments imported successfully</p>
              </div>

              {results.failed.length > 0 && (
                <Card>
                  <CardContent className="p-0 max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead className="w-16">Row</TableHead><TableHead>Party</TableHead><TableHead>Error</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.failed.map((f, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">{f.row}</TableCell>
                            <TableCell>{f.party}</TableCell>
                            <TableCell className="text-red-600 text-sm">{f.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={reset}><Upload className="h-4 w-4 mr-2" />Upload Another File</Button>
                <Button onClick={() => close(false)}><CheckCircle className="h-4 w-4 mr-2" />Done</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
