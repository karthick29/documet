import { LucideProps } from "lucide-react"

export function Rasengan(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
      <path d="M12 12c-2.5-2.5-2.5-6.5 0-9s6.5-2.5 9 0-2.5 6.5-5 9" />
      <path d="M12 12c2.5 2.5 2.5 6.5 0 9s-6.5 2.5-9 0 2.5-6.5 5-9" />
    </svg>
  )
}

export function NinjaScroll(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 3v18" />
      <path d="M3 3v18" />
      <path d="M21 3c-2 0-4 2-4 4s2 4 4 4" />
      <path d="M3 3c2 0 4 2 4 4s-2 4-4 4" />
      <path d="M21 15c-2 0-4 2-4 4s2 4 4 4" />
      <path d="M3 15c2 0 4 2 4 4s-2 4-4 4" />
    </svg>
  )
}

export function Kunai(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2l-7 7 10 10 7-7z" />
      <path d="M5 9l10 10" />
      <circle cx="7.5" cy="11.5" r="1" />
    </svg>
  )
}

export function Shuriken(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2l4 4-4 4-4-4z" />
      <path d="M22 12l-4 4-4-4 4-4z" />
      <path d="M12 22l-4-4 4-4 4 4z" />
      <path d="M2 12l4-4 4 4-4 4z" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  )
} 