'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)

  const {
    resolvedTheme,
    setTheme,
  } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Alternar tema"
        disabled
      >
        <Moon size={18} />
      </button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() =>
        setTheme(isDark ? 'light' : 'dark')
      }
      aria-label={
        isDark
          ? 'Ativar modo claro'
          : 'Ativar modo escuro'
      }
    >
      {isDark ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  )
}