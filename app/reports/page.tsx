export default function Reports() {
  const salesGSTData = [
    { month: "July 2025", taxableAmount: 45000, gstCollected: 5400 },
    { month: "June 2025", taxableAmount: 38000, gstCollected: 4560 },
    { month: "May 2025", taxableAmount: 42000, gstCollected: 5040 },
  ]

  const purchaseGSTData = [
    { month: "July 2025", taxableAmount: 28000, gstPaid: 3360 },
    { month: "June 2025", taxableAmount: 25000, gstPaid: 3000 },
    { month: "May 2025", taxableAmount: 30000, gstPaid: 3600 },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {/* Sales GST Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sales GST Summary (Monthly)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Month</th>
                <th className="table-header">Taxable Amount</th>
                <th className="table-header">GST Collected</th>
                <th className="table-header">Total Sales</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesGSTData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{row.month}</td>
                  <td className="table-cell">₹{row.taxableAmount.toLocaleString()}</td>
                  <td className="table-cell text-green-600 font-medium">₹{row.gstCollected.toLocaleString()}</td>
                  <td className="table-cell font-bold">₹{(row.taxableAmount + row.gstCollected).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="table-cell font-bold">Total</td>
                <td className="table-cell font-bold">
                  ₹{salesGSTData.reduce((sum, row) => sum + row.taxableAmount, 0).toLocaleString()}
                </td>
                <td className="table-cell font-bold text-green-600">
                  ₹{salesGSTData.reduce((sum, row) => sum + row.gstCollected, 0).toLocaleString()}
                </td>
                <td className="table-cell font-bold">
                  ₹{salesGSTData.reduce((sum, row) => sum + row.taxableAmount + row.gstCollected, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Purchase GST Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Purchase GST Summary (Monthly)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Month</th>
                <th className="table-header">Taxable Amount</th>
                <th className="table-header">GST Paid</th>
                <th className="table-header">Total Purchase</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseGSTData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{row.month}</td>
                  <td className="table-cell">₹{row.taxableAmount.toLocaleString()}</td>
                  <td className="table-cell text-red-600 font-medium">₹{row.gstPaid.toLocaleString()}</td>
                  <td className="table-cell font-bold">₹{(row.taxableAmount + row.gstPaid).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="table-cell font-bold">Total</td>
                <td className="table-cell font-bold">
                  ₹{purchaseGSTData.reduce((sum, row) => sum + row.taxableAmount, 0).toLocaleString()}
                </td>
                <td className="table-cell font-bold text-red-600">
                  ₹{purchaseGSTData.reduce((sum, row) => sum + row.gstPaid, 0).toLocaleString()}
                </td>
                <td className="table-cell font-bold">
                  ₹{purchaseGSTData.reduce((sum, row) => sum + row.taxableAmount + row.gstPaid, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* GST Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Net GST Liability</h3>
          <p className="text-3xl font-bold text-blue-600">
            ₹
            {(
              salesGSTData.reduce((sum, row) => sum + row.gstCollected, 0) -
              purchaseGSTData.reduce((sum, row) => sum + row.gstPaid, 0)
            ).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1">GST Collected - GST Paid</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Sales (3 Months)</h3>
          <p className="text-3xl font-bold text-green-600">
            ₹{salesGSTData.reduce((sum, row) => sum + row.taxableAmount + row.gstCollected, 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1">Including GST</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Purchases (3 Months)</h3>
          <p className="text-3xl font-bold text-red-600">
            ₹{purchaseGSTData.reduce((sum, row) => sum + row.taxableAmount + row.gstPaid, 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1">Including GST</p>
        </div>
      </div>
    </div>
  )
}
