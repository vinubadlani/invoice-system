"use client"

import { useState, useEffect, useCallback } from "react"
import { useBusiness } from "@/app/context/BusinessContext"
import { getSupabaseClient } from "@/lib/supabase"
import { rpcApi } from "@/lib/rpc-api"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import DataTable from "@/components/DataTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Globe, RefreshCw, ShoppingBag, Boxes } from "lucide-react"
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
// touches the item catalog. Purely "what does Amazon actually have" so it
// can be cross-checked before any SKU is matched to inventory.
export default function EcommercePage() {
  const { selectedBusiness } = useBusiness()
  const businessId = selectedBusiness?.id || ""
  const { toast } = useToast()

  const [connections, setConnections] = useState<AmazonConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("")
  const [orders, setOrders] = useState<any[]>([])
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)

  const loadRawData = useCallback(
    async (connectionId: string) => {
      if (!businessId || !connectionId) return
      const [ordersRes, itemsRes, inventoryRes] = await Promise.all([
        rpcApi.amazon.getRawOrders(businessId, connectionId),
        rpcApi.amazon.getRawOrderItems(businessId, connectionId),
        rpcApi.amazon.getRawInventory(businessId, connectionId),
      ])
      setOrders(ordersRes.data || [])
      setOrderItems(itemsRes.data || [])
      setInventory(inventoryRes.data || [])
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

  const handleFetchFromAmazon = async () => {
    if (!selectedConnectionId) return
    setFetching(true)
    try {
      const client = getSupabaseClient()
      const { data: sessionData } = await client.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) throw new Error("Not signed in")

      const response = await fetch("/api/integrations/amazon/raw-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ businessId, connectionId: selectedConnectionId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Fetch from Amazon failed")

      toast({
        title: "Fetched from Amazon",
        description: `${data.ordersFetched} orders, ${data.orderItemsFetched} SKUs${
          data.inventoryError ? `. Inventory: ${data.inventoryError}` : `, ${data.inventoryFetched} inventory items`
        }.`,
      })
      await loadRawData(selectedConnectionId)
    } catch (error: any) {
      toast({ title: "Fetch failed", description: error?.message || "Please try again later", variant: "destructive" })
    } finally {
      setFetching(false)
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
  const skus = Array.from(skuMap.values())

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
              Raw data fetched from connected e-commerce platforms — Amazon orders, SKUs, and FBA inventory. Nothing
              here is linked to your item catalog or invoices yet.
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
                {fetching ? "Fetching..." : "Fetch from Amazon"}
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
                        ]}
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
    </AuthenticatedLayout>
  )
}
