import * as React from "react"

import { cn } from "@/lib/utils"

interface CircularProgressProps {
  /** 0–100 */
  value: number
  size?: number
  strokeWidth?: number
  trackClassName?: string
  progressClassName?: string
  className?: string
  children?: React.ReactNode
}

export function CircularProgress({
  value,
  size = 72,
  strokeWidth = 7,
  trackClassName = "stroke-white/25",
  progressClassName = "stroke-white",
  className,
  children,
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", progressClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
