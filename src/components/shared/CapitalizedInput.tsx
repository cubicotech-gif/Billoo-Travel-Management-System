import { useRef } from 'react'
import { capitalizeWords, capitalizeFirst } from '@/lib/textUtils'

interface CapitalizedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onValueChange: (value: string) => void
  capitalizeMode?: 'words' | 'first' | 'none'
}

export default function CapitalizedInput({
  onValueChange,
  capitalizeMode = 'words',
  value,
  ...props
}: CapitalizedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0

    if (capitalizeMode === 'words') {
      newValue = capitalizeWords(newValue)
    } else if (capitalizeMode === 'first') {
      newValue = capitalizeFirst(newValue)
    }

    onValueChange(newValue)

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(cursorPos, cursorPos)
    })
  }

  return (
    <input
      ref={inputRef}
      {...props}
      value={value}
      onChange={handleChange}
    />
  )
}
