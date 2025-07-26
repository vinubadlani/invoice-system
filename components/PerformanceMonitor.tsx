"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Clock, Database, Zap } from "lucide-react"

interface PerformanceMetrics {
  pageLoadTime: number
  dbQueryTime: number
  renderTime: number
  memoryUsage: number
  cacheHitRate: number
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show performance monitor in development
    setIsVisible(process.env.NODE_ENV === 'development')
    
    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart
      
      // Simulate metrics (in production, you'd collect real metrics)
      const metrics: PerformanceMetrics = {
        pageLoadTime: Math.round(pageLoadTime),
        dbQueryTime: Math.round(Math.random() * 100 + 50), // Simulated
        renderTime: Math.round(performance.now()),
        memoryUsage: (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0,
        cacheHitRate: Math.round(Math.random() * 30 + 70), // Simulated
      }
      
      setMetrics(metrics)
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance()
    } else {
      window.addEventListener('load', measurePerformance)
      return () => window.removeEventListener('load', measurePerformance)
    }
  }, [])

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return "default"
    if (value <= thresholds.warning) return "secondary"
    return "destructive"
  }

  if (!isVisible || !metrics) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-lg border-2 border-blue-200 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Page Load</span>
            </div>
            <Badge variant={getStatusColor(metrics.pageLoadTime, { good: 1000, warning: 2000 })}>
              {metrics.pageLoadTime}ms
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-500" />
              <span className="text-sm">DB Query</span>
            </div>
            <Badge variant={getStatusColor(metrics.dbQueryTime, { good: 100, warning: 300 })}>
              {metrics.dbQueryTime}ms
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Cache Hit</span>
            </div>
            <Badge variant={metrics.cacheHitRate > 80 ? "default" : "secondary"}>
              {metrics.cacheHitRate}%
            </Badge>
          </div>

          {metrics.memoryUsage > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Memory</span>
              </div>
              <Badge variant={getStatusColor(metrics.memoryUsage, { good: 50, warning: 100 })}>
                {metrics.memoryUsage}MB
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}