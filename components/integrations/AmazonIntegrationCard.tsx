"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { rpcApi } from "@/lib/rpc-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, RefreshCw, Unlink } from "lucide-react"

type AmazonConnection = {
  id: string
  seller_id: string
  marketplace_id: string
  environment: string
  status: string
  connected_at: string
  last_sync_at: string | null
  last_successful_sync_at: string | null
  last_error: string | null
}

// Only ever reads rpc_get_amazon_connections/rpc_get_amazon_orders (both
// hand-pick safe columns server-side) — this component never sees a token.
export default function AmazonIntegrationCard({ businessId }: { businessId: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [connections, setConnections] = useState<AmazonConnection[]>([])
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({})
  const [unmappedCounts, setUnmappedCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [disconnectTarget, setDisconnectTarget] = useState<AmazonConnection | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const { data } = await rpcApi.amazon.getConnections(businessId)
      const rows = data || []
      setConnections(rows)

      const counts: Record<string, number> = {}
      const unmapped: Record<string, number> = {}
      for (const conn of rows) {
        const [{ data: orders }, { data: mappings }] = await Promise.all([
          rpcApi.amazon.getOrders(businessId, conn.id),
          rpcApi.amazon.getMappings(businessId, conn.id, "unmapped"),
        ])
        counts[conn.id] = orders?.length || 0
        unmapped[conn.id] = mappings?.length || 0
      }
      setOrderCounts(counts)
      setUnmappedCounts(unmapped)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    load()
  }, [load])

  // The OAuth callback redirects back here with ?tab=integrations&amazon=connected|error
  useEffect(() => {
    const status = searchParams?.get("amazon")
    if (!status) return

    if (status === "connected") {
      toast({ title: "Amazon connected", description: "Your Amazon Seller account is now connected." })
      load()
    } else if (status === "error") {
      toast({
        title: "Amazon connection failed",
        description: "Something went wrong connecting your Amazon account. Please try again.",
        variant: "destructive",
      })
    }

    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []))
    params.delete("amazon")
    router.replace(`/settings?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const client = getSupabaseClient()
      const { data: sessionData } = await client.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) throw new Error("Not signed in")

      const response = await fetch("/api/integrations/amazon/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ businessId }),
      })
      const data = await response.json()
      if (!response.ok || !data.authorizeUrl) {
        throw new Error(data.error || "Failed to start Amazon authorization")
      }

      window.location.href = data.authorizeUrl
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to start Amazon connection", variant: "destructive" })
      setConnecting(false)
    }
  }

  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId)
    try {
      const client = getSupabaseClient()
      const { data: sessionData } = await client.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) throw new Error("Not signed in")

      const response = await fetch("/api/integrations/amazon/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ businessId, connectionId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Sync failed")

      toast({
        title: "Sync complete",
        description: `${data.imported} imported, ${data.updated} updated, ${data.unmapped} need SKU mapping, ${data.errors} errors.`,
      })
      await load()
    } catch (error: any) {
      toast({ title: "Sync failed", description: error?.message || "Please try again later", variant: "destructive" })
    } finally {
      setSyncingId(null)
    }
  }

  const handleDisconnect = async () => {
    if (!disconnectTarget) return
    try {
      const { error } = await rpcApi.amazon.disconnect(disconnectTarget.id)
      if (error) throw error
      toast({ title: "Disconnected", description: "Your Amazon account has been disconnected. Imported orders are kept." })
      setDisconnectTarget(null)
      await load()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to disconnect", variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShoppingCart className="h-5 w-5 mr-2 text-orange-500" />
          Amazon Seller Central
        </CardTitle>
        <p className="text-sm text-gray-600">Connect your Amazon Seller account to sync orders and products.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : connections.length === 0 ? (
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? "Redirecting to Amazon..." : "Connect Amazon Seller Account"}
          </Button>
        ) : (
          <div className="space-y-4">
            {connections.map((conn) => (
              <div key={conn.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Seller ID: {conn.seller_id}</span>
                      <Badge variant={conn.status === "connected" ? "default" : conn.status === "error" ? "destructive" : "secondary"}>
                        {conn.status}
                      </Badge>
                      <Badge variant="outline">{conn.environment}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Marketplace: {conn.marketplace_id} · Connected {new Date(conn.connected_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(conn.id)}
                      disabled={syncingId === conn.id || conn.status !== "connected"}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${syncingId === conn.id ? "animate-spin" : ""}`} />
                      {syncingId === conn.id ? "Syncing..." : "Sync Now"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDisconnectTarget(conn)}>
                      <Unlink className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Orders imported</p>
                    <p className="font-medium">{orderCounts[conn.id] ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">SKUs needing mapping</p>
                    <p className="font-medium">{unmappedCounts[conn.id] ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last sync</p>
                    <p className="font-medium">{conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : "Never"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last successful sync</p>
                    <p className="font-medium">
                      {conn.last_successful_sync_at ? new Date(conn.last_successful_sync_at).toLocaleString() : "Never"}
                    </p>
                  </div>
                </div>

                {conn.last_error && (
                  <p className="text-sm text-red-600">Last error: {conn.last_error}</p>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={handleConnect} disabled={connecting}>
              {connecting ? "Redirecting to Amazon..." : "Connect Another Amazon Account"}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Amazon account?</DialogTitle>
            <DialogDescription>
              Seller {disconnectTarget?.seller_id} will be disconnected. Orders and invoices already imported from this
              account are kept — you can reconnect later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
