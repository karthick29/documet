import { Progress } from "@/components/ui/progress"
import { Loader2, FileSpreadsheet } from "lucide-react"
import { motion, useAnimation } from "framer-motion"
import { useEffect } from "react"

interface ProcessingProps {
  progress: number
}

export function Processing({ progress }: ProcessingProps) {
  const controls = useAnimation()

  useEffect(() => {
    controls.start({
      scale: [1, 1.1, 1],
      rotate: [0, 360],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      },
    })
  }, [controls])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 shadow-lg"
    >
      <div className="flex items-center space-x-4">
        <motion.div
          animate={controls}
          className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"
        >
          <FileSpreadsheet className="w-6 h-6 text-white" />
        </motion.div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <motion.p 
              className="text-sm font-medium text-gray-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Processing your data
            </motion.p>
            <motion.p 
              className="text-sm font-medium text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {progress.toString()}%
            </motion.p>
          </div>
          <div className="relative">
            <Progress 
              value={progress} 
              className="h-2 bg-gray-100"
            />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-5 h-5 text-primary" />
        </motion.div>
      </div>
    </motion.div>
  )
} 