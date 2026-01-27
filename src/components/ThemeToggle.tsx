import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      )}
    </button>
  )
}
