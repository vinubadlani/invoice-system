"use client"

import { useState, useEffect, useCallback } from "react"
import { useBusiness } from "@/app/context/BusinessContext"
import { getSupabaseClient } from "@/lib/supabase"
import { rpcApi } from "@/lib/rpc-api"
import { mapAmazonStatusToInvoiceStatus } from "@/lib/amazon/statusMapping"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import DataTable from "@/components/DataTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Globe, RefreshCw, ShoppingBag, Boxes, Eye, PackagePlus } from "lucide-react"
import Link from "next/link"

type AmazonConnection = {
  id: string
  seller_id: string
  marketplace_id: string
  environment: string
  status: string
}

// Read-only view of raw Amazon data (amazon_raw_* tables) — fetched via
// /api/integrations/amazon/raw-import, which never creates invoices or
// touches the item catalog on its own. Orders and SKUs get an explicit,
// user-triggered action ("Convert to Sale" / "Link item") instead — this
// page never auto-matches anything.
export default function EcommercePage() {
  const { selectedBusiness } = useBusiness()
  const businessId = selectedBusiness?.id || ""
  const { toast } = useToast()

  const [connections, setConnections] = useState<AmazonConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("")
  const [orders, setOrders] = useState<any[]>([])
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [itemOptions, setItemOptions] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [fetchProgress, setFetchProgress] = useState<string | null>(null)

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [convertingOrderId, setConvertingOrderId] = useState<string | null>(null)
  const [linkingSku, setLinkingSku] = useState<string | null>(null)
  const [newItemSku, setNewItemSku] = useState<any | null>(null)
  const [newItemForm, setNewItemForm] = useState({ name: "", code: "", unit: "pcs", sales_price: "" })
  const [creatingItem, setCreatingItem] = useState(false)

  const loadRawData = useCallback(
    async (connectionId: string) => {
      if (!businessId || !connectionId) return
      const [ordersRes, itemsRes, inventoryRes, mappingsRes, catalogRes] = await Promise.all([
        rpcApi.amazon.getRawOrders(businessId, connectionId),
        rpcApi.amazon.getRawOrderItems(businessId, connectionId),
        rpcApi.amazon.getRawInventory(businessId, connectionId),
        rpcApi.amazon.getMappings(businessId, connectionId),
        rpcApi.item.getAll(businessId),
      ])
      setOrders(ordersRes.data || [])
      setOrderItems(itemsRes.data || [])
      setInventory(inventoryRes.data || [])
      setMappings(mappingsRes.data || [])
      setItemOptions((catalogRes.data || []).map((item: any) => ({ value: item.id, label: `${item.name} (${item.code})` })))
    },
    [businessId]
  )

  const load = useCallback(async () => {
    if (!businessId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data } = await rpcApi.amazon.getConnections(businessId)
      const rows = (data || []) as AmazonConnection[]
      setConnections(rows)

      const active = rows.find((c) => c.id === selectedConnectionId) || rows[0]
      if (active) {
        setSelectedConnectionId(active.id)
        await loadRawData(active.id)
      } else {
        setOrders([])
        setOrderItems([])
        setInventory([])
        setMappings([])
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, loadRawData])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  const handleConnectionChange = async (connectionId: string) => {
    setSelectedConnectionId(connectionId)
    setLoading(true)
    try {
      await loadRawData(connectionId)
    } finally {
      setLoading(false)
    }
  }

  // A single call only fetches a couple of pages before its own timeout
  // budget — this loops on the returned nextToken until Amazon has no
  // more pages, so "Fetch from Amazon" actually gets everything instead
  // of re-fetching the same first batch forever.
  const handleFetchFromAmazon = async () => {
    if (!selectedConnectionId) return
    setFetching(true)
    setFetchProgress(null)
    const totals = { ordersFetched: 0, orderItemsFetched: 0, inventoryFetched: 0, inventoryError: null as string | null }
    const MAX_ROUNDS = 40 // safety cap — ~2 pages/round, so up to ~4000 orders per click
    try {
      const client = getSupabaseClient()
      const { data: sessionData } = await client.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) throw new Error("Not signed in")

      let resumeToken: string | undefined
      let round = 0
      do {
        round += 1
        setFetchProgress(`Fetching... ${totals.ordersFetched} orders so far`)
        const response = await fetch("/api/integrations/amazon/raw-import", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ businessId, connectionId: selectedConnectionId, resumeToken }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Fetch from Amazon failed")

        totals.ordersFetched += data.ordersFetched || 0
        totals.orderItemsFetched += data.orderItemsFetched || 0
        totals.inventoryFetched += data.inventoryFetched || 0
        if (data.inventoryError) totals.inventoryError = data.inventoryError
        resumeToken = data.nextToken || undefined
      } while (resumeToken && round < MAX_ROUNDS)

      toast({
        title: "Fetched from Amazon",
        description: `${totals.ordersFetched} orders, ${totals.orderItemsFetched} SKUs${
          totals.inventoryError ? `. Inventory: ${totals.inventoryError}` : `, ${totals.inventoryFetched} inventory items`
        }${resumeToken ? " (more orders remain — click Fetch again to continue)" : ""}.`,
      })
      await loadRawData(selectedConnectionId)
    } catch (error: any) {
      toast({ title: "Fetch failed", description: error?.message || "Please try again later", variant: "destructive" })
    } finally {
      setFetching(false)
      setFetchProgress(null)
    }
  }

  const handleConvertToSale = async (order: any) => {
    setConvertingOrderId(order.id)
    try {
      const items = orderItems.filter((i) => i.amazon_order_id === order.amazon_order_id)
      const invoiceItems = items.map((item) => {
        const quantity = item.quantity_ordered || 1
        // item_price_amount is stored exactly as Amazon sent it — the line
        // total for the quantity, not a per-unit price.
        const unitPrice = item.item_price_amount != null ? Number(item.item_price_amount) / quantity : 0
        return {
          name: item.title || item.seller_sku || "Amazon item",
          code: item.seller_sku || undefined,
          quantity,
          price: unitPrice,
          amount: quantity * unitPrice,
        }
      })
      const netTotal = order.order_total_amount != null
        ? Number(order.order_total_amount)
        : invoiceItems.reduce((sum, i) => sum + i.amount, 0)

      const { data: invoiceId, error } = await rpcApi.invoice.create({
        business_id: businessId,
        invoice_no: `AMZ-${order.amazon_order_id}`,
        date: (order.purchase_date || new Date().toISOString()).slice(0, 10),
        party_name: "Amazon Customer",
        state: "N/A (Amazon order)",
        address: "N/A (Amazon order)",
        items: invoiceItems,
        subtotal: netTotal,
        net_total: netTotal,
        type: "sales",
        status: mapAmazonStatusToInvoiceStatus(order.order_status),
        payment_method: "Amazon",
        source: "amazon",
      })
      if (error || !invoiceId) throw new Error(error?.message || "Failed to create sale")

      await rpcApi.amazon.linkRawOrderInvoice(order.id, invoiceId)

      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, invoice_id: invoiceId } : o)))
      setSelectedOrder((prev: any) => (prev?.id === order.id ? { ...prev, invoice_id: invoiceId } : prev))
      toast({ title: "Converted to sale", description: `Sale ${`AMZ-${order.amazon_order_id}`} created.` })
    } catch (error: any) {
      toast({ title: "Conversion failed", description: error?.message || "Please try again", variant: "destructive" })
    } finally {
      setConvertingOrderId(null)
    }
  }

  const handleLinkSku = async (sku: any, itemId: string) => {
    setLinkingSku(sku.seller_sku)
    try {
      const { data, error } = await rpcApi.amazon.upsertSkuMapping({
        connectionId: selectedConnectionId,
        amazonSku: sku.seller_sku,
        amazonAsin: sku.asin,
        title: sku.title,
        itemId,
        status: "mapped",
      })
      if (error) throw new Error(error.message || "Failed to link SKU")
      setMappings((prev) => {
        const others = prev.filter((m) => m.amazon_sku !== sku.seller_sku)
        return data ? [...others, data] : others
      })
      toast({ title: "Linked", description: `${sku.seller_sku} linked to catalog item.` })
    } catch (error: any) {
      toast({ title: "Link failed", description: error?.message || "Please try again", variant: "destructive" })
    } finally {
      setLinkingSku(null)
    }
  }

  const handleCreateItem = async () => {
    if (!newItemSku || !newItemForm.name || !newItemForm.code) return
    setCreatingItem(true)
    try {
      const { data: itemId, error } = await rpcApi.item.create({
        business_id: businessId,
        name: newItemForm.name,
        code: newItemForm.code,
        unit: newItemForm.unit || "pcs",
        sales_price: Number(newItemForm.sales_price) || 0,
      })
      if (error || !itemId) throw new Error(error?.message || "Failed to create item")

      setItemOptions((prev) => [...prev, { value: itemId, label: `${newItemForm.name} (${newItemForm.code})` }])
      await handleLinkSku(newItemSku, itemId)
      setNewItemSku(null)
      setNewItemForm({ name: "", code: "", unit: "pcs", sales_price: "" })
    } catch (error: any) {
      toast({ title: "Create item failed", description: error?.message || "Please try again", variant: "destructive" })
    } finally {
      setCreatingItem(false)
    }
  }

  const selectedConnection = connections.find((c) => c.id === selectedConnectionId)

  // Distinct SKUs across all fetched order items (a SKU can repeat across orders).
  const skuMap = new Map<string, any>()
  for (const item of orderItems) {
    const key = item.seller_sku || `unknown-${item.id}`
    const existing = skuMap.get(key)
    if (!existing) {
      skuMap.set(key, {
        seller_sku: item.seller_sku,
        asin: item.asin,
        title: item.title,
        times_ordered: 1,
        total_quantity_ordered: item.quantity_ordered || 0,
      })
    } else {
      existing.times_ordered += 1
      existing.total_quantity_ordered += item.quantity_ordered || 0
    }
  }
  const skus = Array.from(skuMap.values()).map((sku) => {
    const mapping = mappings.find((m) => m.amazon_sku === sku.seller_sku)
    return { ...sku, item_id: mapping?.item_id || null, mapping_status: mapping?.mapping_status || "unmapped" }
  })

  const selectedOrderItems = selectedOrder
    ? orderItems.filter((i) => i.amazon_order_id === selectedOrder.amazon_order_id)
    : []

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-orange-500" />
              E-commerce
            </h1>
            <p className="text-sm text-muted-foreground">
              Raw data fetched from connected e-commerce platforms — Amazon orders, SKUs, and FBA inventory. Convert
              an order to a sale or link a SKU to your catalog whenever you're ready.
            </p>
          </div>

          {connections.length > 0 && (
            <div className="flex items-center gap-2">
              {connections.length > 1 && (
                <Select value={selectedConnectionId} onValueChange={handleConnectionChange}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.seller_id} ({c.environment})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={handleFetchFromAmazon} disabled={fetching || !selectedConnectionId}>
                <RefreshCw className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`} />
                {fetching ? fetchProgress || "Fetching..." : "Fetch from Amazon"}
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No Amazon account connected for this business yet.</p>
              <Link href="/settings?tab=integrations">
                <Button variant="outline">Go to Settings → Integrations</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {selectedConnection && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Seller ID: {selectedConnection.seller_id}</span>
                <Badge variant="outline">{selectedConnection.environment}</Badge>
                <Badge variant={selectedConnection.status === "connected" ? "default" : "secondary"}>
                  {selectedConnection.status}
                </Badge>
                {selectedConnection.environment === "sandbox" && (
                  <span className="text-xs text-amber-600">
                    Sandbox only ever returns Amazon's fixed test orders, never your real data.
                  </span>
                )}
              </div>
            )}

            <Tabs defaultValue="orders">
              <TabsList>
                <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
                <TabsTrigger value="skus">SKUs ({skus.length})</TabsTrigger>
                <TabsTrigger value="inventory">Inventory ({inventory.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Orders fetched from Amazon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        No orders fetched yet. Click "Fetch from Amazon" above.
                      </p>
                    ) : (
                      <DataTable
                        data={orders}
                        searchKeys={["amazon_order_id", "order_status"]}
                        columns={[
                          { key: "amazon_order_id", label: "Amazon Order ID" },
                          {
                            key: "order_status",
                            label: "Status",
                            render: (v) => (v ? <Badge variant="outline">{v}</Badge> : "-"),
                          },
                          {
                            key: "purchase_date",
                            label: "Purchase Date",
                            render: (v) => (v ? new Date(v).toLocaleString() : "-"),
                          },
                          {
                            key: "order_total_amount",
                            label: "Total",
                            render: (v, row) => (v != null ? `${row.order_total_currency || ""} ${v}` : "-"),
                          },
                          { key: "fulfillment_channel", label: "Fulfillment" },
                        ]}
                        actions={(row) => (
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => setSelectedOrder(row)}>
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                            {row.invoice_id ? (
                              <Badge variant="secondary">Sale created</Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleConvertToSale(row)}
                                disabled={convertingOrderId === row.id}
                              >
                                {convertingOrderId === row.id ? "Converting..." : "Convert to Sale"}
                              </Button>
                            )}
                          </div>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="skus">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">SKUs seen in fetched orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {skus.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No SKUs fetched yet.</p>
                    ) : (
                      <DataTable
                        data={skus}
                        searchKeys={["seller_sku", "asin", "title"]}
                        columns={[
                          { key: "seller_sku", label: "SKU" },
                          { key: "asin", label: "ASIN" },
                          { key: "title", label: "Product Title" },
                          { key: "times_ordered", label: "Times Ordered" },
                          { key: "total_quantity_ordered", label: "Total Qty Ordered" },
                          {
                            key: "mapping_status",
                            label: "Status",
                            render: (v) => <Badge variant={v === "mapped" ? "default" : "secondary"}>{v}</Badge>,
                          },
                        ]}
                        actions={(row) => (
                          <div className="flex items-center gap-1.5 min-w-[260px]">
                            <SearchableSelect
                              options={itemOptions}
                              value={row.item_id || undefined}
                              onValueChange={(value) => handleLinkSku(row, value)}
                              placeholder="Link existing item..."
                              searchPlaceholder="Search items..."
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={linkingSku === row.seller_sku}
                              onClick={() => {
                                setNewItemSku(row)
                                setNewItemForm({ name: row.title || row.seller_sku || "", code: row.seller_sku || "", unit: "pcs", sales_price: "" })
                              }}
                            >
                              <PackagePlus className="h-3.5 w-3.5 mr-1" />
                              New
                            </Button>
                          </div>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inventory">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Boxes className="h-4 w-4" />
                      Amazon FBA inventory
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {inventory.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-6 text-center space-y-1">
                        <p>No FBA inventory found.</p>
                        <p className="text-xs">
                          This only covers stock Fulfilled by Amazon (FBA) — self/merchant-fulfilled listings have no
                          bulk inventory endpoint on Amazon's side, and won't show up here even if active.
                        </p>
                      </div>
                    ) : (
                      <DataTable
                        data={inventory}
                        searchKeys={["seller_sku", "asin"]}
                        columns={[
                          { key: "seller_sku", label: "SKU" },
                          { key: "asin", label: "ASIN" },
                          { key: "condition", label: "Condition" },
                          { key: "total_quantity", label: "Total Qty" },
                          { key: "fulfillable_quantity", label: "Fulfillable Qty" },
                        ]}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.amazon_order_id}</DialogTitle>
            <DialogDescription>
              {selectedOrder?.purchase_date ? new Date(selectedOrder.purchase_date).toLocaleString() : "-"}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedOrder.order_status || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fulfillment</p>
                  <p className="font-medium">{selectedOrder.fulfillment_channel || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">
                    {selectedOrder.order_total_amount != null
                      ? `${selectedOrder.order_total_currency || ""} ${selectedOrder.order_total_amount}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Marketplace</p>
                  <p className="font-medium">{selectedOrder.marketplace_id || "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Line items</p>
                {selectedOrderItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No line items fetched for this order.</p>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {selectedOrderItems.map((item) => (
                      <div key={item.id} className="p-2.5 text-sm flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title || item.seller_sku}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.seller_sku}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p>Qty {item.quantity_ordered ?? "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.item_price_currency || ""} {item.item_price_amount ?? "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedOrder?.invoice_id ? (
              <Badge variant="secondary">Already converted to a sale</Badge>
            ) : (
              <Button
                onClick={() => selectedOrder && handleConvertToSale(selectedOrder)}
                disabled={convertingOrderId === selectedOrder?.id}
              >
                {convertingOrderId === selectedOrder?.id ? "Converting..." : "Convert to Sale"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create-new-item dialog (from the SKUs tab "New" button) */}
      <Dialog open={!!newItemSku} onOpenChange={(open) => !open && setNewItemSku(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create item for {newItemSku?.seller_sku}</DialogTitle>
            <DialogDescription>Creates a new catalog item and links this Amazon SKU to it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Item name</Label>
              <Input value={newItemForm.name} onChange={(e) => setNewItemForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input value={newItemForm.code} onChange={(e) => setNewItemForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={newItemForm.unit} onChange={(e) => setNewItemForm((f) => ({ ...f, unit: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Sales price</Label>
              <Input
                type="number"
                value={newItemForm.sales_price}
                onChange={(e) => setNewItemForm((f) => ({ ...f, sales_price: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewItemSku(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem} disabled={creatingItem || !newItemForm.name || !newItemForm.code}>
              {creatingItem ? "Creating..." : "Create & Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  )
}
