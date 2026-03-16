import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import jsPDF from "jspdf"
import "jspdf-autotable"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const downloadPDF = (data: any[], filename: string, title: string) => {
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(16)
  doc.text(title, 14, 22)

  // Add table
  const headers = Object.keys(data[0] || {})
  const rows = data.map((item) => headers.map((header) => item[header]))
  ;(doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: 30,
  })

  doc.save(`${filename}.pdf`)
}

export const downloadCSV = (data: any[], filename: string) => {
  const headers = Object.keys(data[0] || {})
  const csvContent = [
    headers.join(","),
    ...data.map((row) => headers.map((header) => `"${row[header] || ""}"`).join(",")),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const parseCSV = (csvText: string) => {
  const lines = csvText.split("\n")
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header] = values[index] || ""
      })
      return obj
    })
    .filter((obj) => Object.values(obj).some((val) => val !== ""))
}
