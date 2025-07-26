"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Filter, X, RefreshCw, Download } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export interface FilterConfig {
  id: string
  label: string
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export interface FilterValues {
  [key: string]: any
}

interface DataTableFiltersProps {
  filters: FilterConfig[]
  onFilterChange: (filters: FilterValues) => void
  onExport?: () => void
  showFinancialYear?: boolean
  financialYear?: string
  onFinancialYearChange?: (year: string) => void
}

// Get current financial year (April to March)
const getCurrentFinancialYear = () => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed
  
  if (currentMonth >= 4) {
    return `${currentYear}-${currentYear + 1}`
  } else {
    return `${currentYear - 1}-${currentYear}`
  }
}

// Generate financial year options
const getFinancialYearOptions = () => {
  const options = []
  const currentYear = new Date().getFullYear()
  
  for (let i = -5; i <= 2; i++) {
    const startYear = currentYear + i
    const endYear = startYear + 1
    options.push({
      value: `${startYear}-${endYear}`,
      label: `FY ${startYear}-${endYear.toString().slice(2)}`
    })
  }
  
  return options
}

export default function DataTableFilters({
  filters,
  onFilterChange,
  onExport,
  showFinancialYear = true,
  financialYear,
  onFinancialYearChange
}: DataTableFiltersProps) {
  const [filterValues, setFilterValues] = useState<FilterValues>({})
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [currentFinancialYear, setCurrentFinancialYear] = useState(financialYear || getCurrentFinancialYear())

  useEffect(() => {
    if (showFinancialYear && onFinancialYearChange) {
      onFinancialYearChange(currentFinancialYear)
    }
  }, [currentFinancialYear, showFinancialYear, onFinancialYearChange])

  const handleFilterChange = (filterId: string, value: any) => {
    const newValues = { ...filterValues, [filterId]: value }
    setFilterValues(newValues)
    
    // Update active filters
    const newActiveFilters = Object.keys(newValues).filter(key => {
      const val = newValues[key]
      return val !== undefined && val !== null && val !== '' && 
             (Array.isArray(val) ? val.length > 0 : true)
    })
    setActiveFilters(newActiveFilters)
    
    onFilterChange(newValues)
  }

  const clearAllFilters = () => {
    setFilterValues({})
    setActiveFilters([])
    onFilterChange({})
  }

  const clearFilter = (filterId: string) => {
    const newValues = { ...filterValues }
    delete newValues[filterId]
    setFilterValues(newValues)
    
    const newActiveFilters = activeFilters.filter(id => id !== filterId)
    setActiveFilters(newActiveFilters)
    
    onFilterChange(newValues)
  }

  const renderFilter = (filter: FilterConfig) => {
    const value = filterValues[filter.id]

    switch (filter.type) {
      case 'text':
        return (
          <Input
            placeholder={filter.placeholder || `Filter by ${filter.label.toLowerCase()}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full"
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            placeholder={filter.placeholder || `Filter by ${filter.label.toLowerCase()}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full"
          />
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => handleFilterChange(filter.id, val)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All {filter.label}</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "PPP") : `Select ${filter.label.toLowerCase()}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFilterChange(filter.id, date?.toISOString().split('T')[0])}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case 'dateRange':
        return (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !value?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value?.from ? format(new Date(value.from), "MMM dd") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value?.from ? new Date(value.from) : undefined}
                  onSelect={(date) => handleFilterChange(filter.id, { 
                    ...value, 
                    from: date?.toISOString().split('T')[0] 
                  })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !value?.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value?.to ? format(new Date(value.to), "MMM dd") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value?.to ? new Date(value.to) : undefined}
                  onSelect={(date) => handleFilterChange(filter.id, { 
                    ...value, 
                    to: date?.toISOString().split('T')[0] 
                  })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="mb-6 bg-card dark:bg-gray-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilters.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Financial Year Filter */}
        {showFinancialYear && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-border">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Financial Year</Label>
              <Select 
                value={currentFinancialYear} 
                onValueChange={setCurrentFinancialYear}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getFinancialYearOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Main Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filters.map((filter) => (
            <div key={filter.id} className="space-y-2">
              <Label className="text-sm font-medium">{filter.label}</Label>
              {renderFilter(filter)}
            </div>
          ))}
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
            {activeFilters.map((filterId) => {
              const filter = filters.find(f => f.id === filterId)
              const value = filterValues[filterId]
              let displayValue = value

              if (filter?.type === 'dateRange' && value?.from && value?.to) {
                displayValue = `${format(new Date(value.from), "MMM dd")} - ${format(new Date(value.to), "MMM dd")}`
              } else if (filter?.type === 'date' && value) {
                displayValue = format(new Date(value), "MMM dd, yyyy")
              } else if (filter?.type === 'select' && filter.options) {
                const option = filter.options.find(opt => opt.value === value)
                displayValue = option?.label || value
              }

              return (
                <Badge key={filterId} variant="secondary" className="flex items-center gap-1">
                  {filter?.label}: {displayValue}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => clearFilter(filterId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}