"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download } from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface Transaction {
  DATE: string
  DESCRIPTION: string
  DEBITS: string
  CREDITS: string
  BALANCE: string
}

interface CheckDetail {
  DATE: string
  DESCRIPTION: string
  AMOUNT: string
  PARTICULARS: string
  CHEQUE_NO: string
  NARRATION: string
}

// Import the types from app/page.tsx or create them here
interface GlTransaction {
  amount: number;
  description: string;
  vendorId?: string;
  vendorName?: string;
  glAccount?: string;
  originalRow: string;
}

interface BankTransaction {
  // Standard format fields
  date?: string;
  description?: string;
  amount?: number;
  debit?: string | number;
  credit?: string | number;
  // Extract API format fields (capitalized)
  DATE?: string;
  DESCRIPTION?: string;
  DEBITS?: string | number; 
  CREDITS?: string | number;
  BALANCE?: string | number;
}

interface DetailedComparisonResult {
  bankTransaction: BankTransaction;
  matchedGlTransaction: GlTransaction | null;
  matchStatus: 'Matched' | 'Unmatched';
  documentNumber?: string;
}

interface MonthSummary {
  transactions: Transaction[];
  checkDetails: CheckDetail[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
  accountSummary: {
    openingBalance: string;
    totalCredits: string;
    totalDebits: string;
    closingBalance: string;
    companyName: string;
    bankName: string;
    accountNumber: string;
  };
}

interface ResultProps {
  accountSummary: Record<string, MonthSummary> | null;
  months: string[];
  defaultMonth: string;
  onDownload: () => void;
  excelFileName: string;
}

export function Result({
  accountSummary,
  months,
  defaultMonth,
  onDownload,
  excelFileName
}: ResultProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  if (!accountSummary || Object.keys(accountSummary).length === 0) {
    return null
  }

  const firstMonth = Object.keys(accountSummary)[0]
  const firstMonthData = accountSummary[firstMonth]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white/50 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4">Balance Summary</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600">Opening Balance:</span>
              <span className="font-medium">₹{firstMonthData.accountSummary.openingBalance}</span>
              <span className="text-gray-600">Total Credits:</span>
              <span className="font-medium text-green-600">₹{firstMonthData.accountSummary.totalCredits}</span>
              <span className="text-gray-600">Total Debits:</span>
              <span className="font-medium text-red-600">₹{firstMonthData.accountSummary.totalDebits}</span>
              <span className="text-gray-600">Closing Balance:</span>
              <span className="font-medium">₹{firstMonthData.accountSummary.closingBalance}</span>
            </div>
          </div>
        </Card>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1"
        >
          <button
            onClick={onDownload}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Download className="w-5 h-5" />
            Download: Working Excel File
          </button>
        </motion.div>
      </div>
      <Tabs defaultValue={defaultMonth} className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-4 gap-2">
          {months.map((month: string, monthIndex: number) => (
            <TabsTrigger 
              key={`month-tab-${month}-${monthIndex}`} 
              value={month} 
              className="text-sm"
            >
              {month}
            </TabsTrigger>
          ))}
        </TabsList>

        {months.map((month: string, monthIndex: number) => {
          const monthData = accountSummary[month];
          if (!monthData) return null;

          return (
            <TabsContent key={`month-content-${month}-${monthIndex}`} value={month}>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-6 bg-white/50 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-4">Account Summary</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-600">Company Name:</span>
                      <span className="font-medium">{monthData.accountSummary.companyName}</span>
                      <span className="text-gray-600">Bank Name:</span>
                      <span className="font-medium">{monthData.accountSummary.bankName}</span>
                      <span className="text-gray-600">Account Number:</span>
                      <span className="font-medium">{monthData.accountSummary.accountNumber}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white/50 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-4">Balance Summary</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-600">Opening Balance:</span>
                      <span className="font-medium">₹{monthData.accountSummary.openingBalance}</span>
                      <span className="text-gray-600">Total Credits:</span>
                      <span className="font-medium text-green-600">₹{monthData.accountSummary.totalCredits}</span>
                      <span className="text-gray-600">Total Debits:</span>
                      <span className="font-medium text-red-600">₹{monthData.accountSummary.totalDebits}</span>
                      <span className="text-gray-600">Closing Balance:</span>
                      <span className="font-medium">₹{monthData.accountSummary.closingBalance}</span>
                    </div>
                  </div>
                </Card>

                {monthData.transactions?.length > 0 && (
                  <motion.div 
                    className="md:col-span-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="p-6 bg-white/50 backdrop-blur-sm">
                      <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Description</th>
                              <th className="text-right p-2">Debit</th>
                              <th className="text-right p-2">Credit</th>
                              <th className="text-right p-2">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthData.transactions.map((transaction: Transaction, transactionIndex: number) => (
                              <tr 
                                key={`transaction-${month}-${transaction.DATE}-${transactionIndex}`}
                                className="border-b border-gray-100"
                              >
                                <td className="p-2">{transaction.DATE}</td>
                                <td className="p-2">{transaction.DESCRIPTION}</td>
                                <td className="p-2 text-right text-red-600">{transaction.DEBITS ? `₹${transaction.DEBITS}` : ''}</td>
                                <td className="p-2 text-right text-green-600">{transaction.CREDITS ? `₹${transaction.CREDITS}` : ''}</td>
                                <td className="p-2 text-right">{`₹${transaction.BALANCE}`}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </motion.div>
                )}

                {monthData.checkDetails?.length > 0 && (
                  <motion.div 
                    className="md:col-span-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="p-6 bg-white/50 backdrop-blur-sm">
                      <h3 className="text-lg font-semibold mb-4">Check Details</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Particulars</th>
                              <th className="text-left p-2">Cheque No</th>
                              <th className="text-right p-2">Amount</th>
                              <th className="text-left p-2">Narration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthData.checkDetails.map((check: CheckDetail, checkIndex: number) => (
                              <tr 
                                key={`check-${month}-${check.DATE}-${check.CHEQUE_NO}-${checkIndex}`}
                                className="border-b border-gray-100"
                              >
                                <td className="p-2">{check.DATE}</td>
                                <td className="p-2">{check.PARTICULARS}</td>
                                <td className="p-2">{check.CHEQUE_NO}</td>
                                <td className="p-2 text-right">{`₹${check.AMOUNT}`}</td>
                                <td className="p-2">{check.NARRATION}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
} 