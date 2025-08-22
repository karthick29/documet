import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion } from "framer-motion"
import { Building2, ChevronDown } from "lucide-react"
import { companies } from "@/lib/data"

interface DropdownProps {
  onSelect: (value: string) => void
}

export function Dropdown({ onSelect }: DropdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <Select onValueChange={onSelect}>
        <SelectTrigger className="w-full h-12 bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:bg-white/90 transition-colors">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            <SelectValue placeholder="Select a company" />
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </SelectTrigger>
        <SelectContent className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg">
          {companies.map((company) => (
            <SelectItem
              key={company.id}
              value={company.id}
              className="hover:bg-gray-100/80 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span>{company.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  )
} 