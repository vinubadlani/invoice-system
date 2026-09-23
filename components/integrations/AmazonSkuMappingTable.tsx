"use client"

import { useEffect, useState, useCallback } from "react"
import { rpcApi } from "@/lib/rpc-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useToast } from "@/hooks/use-toast"

type Mapping = {
  id: string
  amazon_sku: string
  amazon_asin: string | null
  last_seen_product_title: string | null
  item_id: string | null
  mapping_status: string
}

export default function AmazonSkuMappingTable({ businessId }: { businessId: string }) {
  const { toast } = useToast()
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [items, setItems] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const [{ data: mappingRows }, { data: itemRows }] = await Promise.all([
        rpcApi.amazon.getMappings(businessId),
        rpcApi.item.getAll(businessId),
      ])
      setMappings(mappingRows || [])
      setItems((itemRows || []).map((item: any) => ({ value: item.id, label: `${item.name} (${item.code})` })))
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    load()
  }, [load])

  const handleMap = async (mapping: Mapping, itemId: string) => {
    const { error } = await rpcApi.amazon.mapSku(mapping.id, itemId, "mapped")
    if (error) {
      toast({ title: "Error", description: "Failed to save mapping", variant: "destructive" })
      return
    }
    setMappings((prev) => prev.map((m) => (m.id === mapping.id ? { ...m, item_id: itemId, mapping_status: "mapped" } : m)))
  }

  if (loading) return null
  if (mappings.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amazon SKU Mapping</CardTitle>
        <p className="text-sm text-gray-600">
          Map each Amazon SKU to an item in your catalog so future orders link to the right product.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amazon SKU</TableHead>
              <TableHead>Amazon Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mapped Item</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping) => (
              <TableRow key={mapping.id}>
                <TableCell className="font-mono text-xs">{mapping.amazon_sku}</TableCell>
                <TableCell>{mapping.last_seen_product_title || "—"}</TableCell>
                <TableCell>
                  <Badge variant={mapping.mapping_status === "mapped" ? "default" : "secondary"}>
                    {mapping.mapping_status}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-[220px]">
                  <SearchableSelect
                    options={items}
                    value={mapping.item_id || undefined}
                    onValueChange={(value) => handleMap(mapping, value)}
                    placeholder="Select item..."
                    searchPlaceholder="Search items..."
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
