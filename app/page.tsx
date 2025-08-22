"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUpload } from "@/components/FileUpload"
import { Processing } from "@/components/Processing"
import { Result } from "@/components/Result"
import { Dropdown } from "@/components/Dropdown"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import { companies, type Company } from "@/lib/data"
import { Rasengan, NinjaScroll, Kunai, Shuriken } from "@/components/icons/NarutoIcons"
import { 
  FileText, 
  FileSpreadsheet, 
  FileCheck, 
  FileSearch, 
  FileBarChart, 
  FileStack, 
  FileDigit, 
  FileJson,
  Brain,
  Banknote,
  Calculator,
  Receipt,
  Wallet,
  PiggyBank,
  LineChart,
  BarChart3,
  Building2,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [accountSummary, setAccountSummary] = useState<any>(null)
  const [excelData, setExcelData] = useState<{ content: string; fileName: string } | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>("upload");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (accountSummary) {
      setSelectedTab("results");
    }
  }, [accountSummary]);

  if (!mounted) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-100 via-white to-pink-100">
        <main className="container mx-auto p-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                Bank Statement Processor
              </h1>
              <p className="text-gray-600">
                Convert your bank statements to organized Excel files
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const processImages = async (uploadedBankFiles: File[]) => {
    setFiles(uploadedBankFiles)
    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setAccountSummary(null)
    setExcelData(null)
    setSelectedTab("upload");
    try {
      setProgress(10);
      const formData = new FormData()
      uploadedBankFiles.forEach((file) => {
        formData.append("image", file)
      })
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process bank statements");
      }
      const result = await response.json();
      setAccountSummary(result.data)
      setExcelData({
        content: result.excelContent,
        fileName: result.fileName
      })
      setProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  const handleDownloadExcel = () => {
    if (!excelData) return
    const byteCharacters = atob(excelData.content)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = excelData.fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const floatingIcons = [
    { Icon: FileText, color: "text-blue-500", size: 32, opacity: 0.4 },
    { Icon: FileSpreadsheet, color: "text-green-500", size: 36, opacity: 0.5 },
    { Icon: FileCheck, color: "text-purple-500", size: 30, opacity: 0.45 },
    { Icon: FileSearch, color: "text-pink-500", size: 34, opacity: 0.4 },
    { Icon: FileBarChart, color: "text-orange-500", size: 38, opacity: 0.5 },
    { Icon: FileStack, color: "text-indigo-500", size: 32, opacity: 0.45 },
    { Icon: FileDigit, color: "text-teal-500", size: 30, opacity: 0.4 },
    { Icon: FileJson, color: "text-yellow-500", size: 28, opacity: 0.5 },
    { Icon: Brain, color: "text-red-500", size: 36, opacity: 0.45 },
    { Icon: Banknote, color: "text-emerald-500", size: 40, opacity: 0.5 },
    { Icon: Calculator, color: "text-cyan-500", size: 34, opacity: 0.4 },
    { Icon: Receipt, color: "text-rose-500", size: 32, opacity: 0.45 },
    { Icon: Wallet, color: "text-violet-500", size: 30, opacity: 0.5 },
    { Icon: PiggyBank, color: "text-amber-500", size: 42, opacity: 0.45 },
    { Icon: LineChart, color: "text-sky-500", size: 36, opacity: 0.4 },
    { Icon: BarChart3, color: "text-fuchsia-500", size: 34, opacity: 0.5 },
    { Icon: FileText, color: "text-blue-600", size: 38, opacity: 0.45 },
    { Icon: Brain, color: "text-red-600", size: 40, opacity: 0.5 },
    { Icon: Calculator, color: "text-emerald-600", size: 36, opacity: 0.4 },
    { Icon: PiggyBank, color: "text-purple-600", size: 44, opacity: 0.45 },
    { Icon: LineChart, color: "text-orange-600", size: 38, opacity: 0.5 },
    { Icon: Banknote, color: "text-teal-600", size: 42, opacity: 0.4 },
    { Icon: Receipt, color: "text-pink-600", size: 34, opacity: 0.45 },
    { Icon: FileBarChart, color: "text-indigo-600", size: 40, opacity: 0.5 },
    { Icon: Rasengan, color: "text-blue-500", size: 48, opacity: 0.6 },
    { Icon: Rasengan, color: "text-blue-600", size: 52, opacity: 0.7 },
    { Icon: NinjaScroll, color: "text-amber-500", size: 44, opacity: 0.6 },
    { Icon: NinjaScroll, color: "text-amber-600", size: 48, opacity: 0.7 },
    { Icon: Kunai, color: "text-gray-500", size: 36, opacity: 0.6 },
    { Icon: Kunai, color: "text-gray-600", size: 40, opacity: 0.7 },
    { Icon: Shuriken, color: "text-indigo-500", size: 42, opacity: 0.6 },
    { Icon: Shuriken, color: "text-indigo-600", size: 46, opacity: 0.7 }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-100 via-white to-pink-100">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400 to-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {floatingIcons.map(({ Icon, color, size, opacity }, index) => (
          <motion.div
            key={index}
            className={`absolute ${color}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: opacity,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, 50, 0],
              rotate: [0, 360],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 15 + Math.random() * 15,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          >
            <Icon size={size} />
          </motion.div>
        ))}

        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.6, 0.9, 0.6],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}

        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute w-32 h-32 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <main className="container mx-auto p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto"
        >
          <div className="mb-8 text-center">
            <motion.h1 
              className="text-4xl font-bold text-gray-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Bank Statement Processor
            </motion.h1>
            <motion.p 
              className="text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Convert your bank statements to organized Excel files
            </motion.p>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto bg-white/80 backdrop-blur-sm border border-white/20">
              <TabsTrigger value="upload">Upload Files</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm border border-white/20">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Upload Bank Statements</CardTitle>
                  <CardDescription>
                    Upload bank statement images or PDFs to process.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="grid grid-cols-1 gap-4 w-full">
                      <div>
                        <FileUpload
                          onUpload={processImages}
                          accept="image/*,application/pdf"
                          multiple={true}
                        />
                        {files.length > 0 && <p className="text-xs text-green-600 mt-1">{files.length} statement(s) selected.</p>}
                      </div>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Processing progress={progress} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <p className="text-red-600 text-center">{error}</p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <AnimatePresence>
                {accountSummary ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm border border-white/20">
                      <CardHeader>
                        <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                          Processed Results
                        </CardTitle>
                        <CardDescription>
                          View bank summary and download Excel file.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Result 
                          onDownload={handleDownloadExcel}
                          accountSummary={accountSummary}
                          excelFileName={excelData?.fileName || ''}
                          months={Object.keys(accountSummary || {})}
                          defaultMonth={Object.keys(accountSummary || {})[0] || ''}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : !isProcessing && !error && files.length > 0 ? (
                  <p className="text-center text-gray-500">Processing complete, but no results generated.</p>
                ) : !isProcessing && !error && files.length === 0 ? (
                  <p className="text-center text-gray-500">Upload bank statements to see results here.</p>
                ) : null}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  )
}

