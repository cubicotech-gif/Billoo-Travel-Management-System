import { useState, useRef, useEffect } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isAfter, isBefore } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface DateRangePickerProps {
  departureDate: string
  returnDate: string
  onDepartureChange: (date: string) => void
  onReturnChange: (date: string) => void
}

export default function DateRangePicker({
  departureDate,
  returnDate,
  onDepartureChange,
  onReturnChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectingEnd, setSelectingEnd] = useState(false)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const startDate = departureDate ? new Date(departureDate + 'T00:00:00') : null
  const endDate = returnDate ? new Date(returnDate + 'T00:00:00') : null

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Jump to start date month when opening
  useEffect(() => {
    if (isOpen) {
      if (startDate) {
        setCurrentMonth(startOfMonth(startDate))
      } else {
        setCurrentMonth(startOfMonth(new Date()))
      }
    }
  }, [isOpen, departureDate])

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')

    if (!selectingEnd || !startDate) {
      onDepartureChange(dateStr)
      onReturnChange('')
      setSelectingEnd(true)
    } else {
      if (isBefore(date, startDate)) {
        // Clicked before start — reset to this as new start
        onDepartureChange(dateStr)
        onReturnChange('')
      } else {
        onReturnChange(dateStr)
        setSelectingEnd(false)
        setIsOpen(false)
      }
    }
  }

  const isInRange = (date: Date) => {
    if (!startDate) return false
    const end = selectingEnd && hoveredDate ? hoveredDate : endDate
    if (!end) return false
    return isAfter(date, startDate) && isBefore(date, end)
  }

  const isRangeStart = (date: Date) => startDate && isSameDay(date, startDate)
  const isRangeEnd = (date: Date) => {
    if (selectingEnd && hoveredDate) return isSameDay(date, hoveredDate)
    return endDate && isSameDay(date, endDate)
  }

  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)

    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }

    return (
      <div className="w-full">
        <div className="text-center text-sm font-semibold text-gray-800 mb-2">
          {format(monthDate, 'MMMM yyyy')}
        </div>
        <div className="grid grid-cols-7 gap-0">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
          {days.map((d, i) => {
            const inMonth = isSameMonth(d, monthDate)
            const isStart = isRangeStart(d)
            const isEnd = isRangeEnd(d)
            const inRange = isInRange(d)
            const isToday = isSameDay(d, new Date())

            return (
              <button
                key={i}
                type="button"
                disabled={!inMonth}
                onClick={() => inMonth && handleDateClick(d)}
                onMouseEnter={() => selectingEnd && inMonth && setHoveredDate(d)}
                className={`
                  h-8 text-xs rounded-md transition-colors relative
                  ${!inMonth ? 'text-gray-200 cursor-default' : 'cursor-pointer hover:bg-primary-50'}
                  ${isStart ? 'bg-primary-600 text-white hover:bg-primary-700 font-semibold' : ''}
                  ${isEnd && !isStart ? 'bg-primary-600 text-white hover:bg-primary-700 font-semibold' : ''}
                  ${inRange && !isStart && !isEnd ? 'bg-primary-100 text-primary-800' : ''}
                  ${isToday && !isStart && !isEnd && !inRange ? 'border border-primary-400 font-semibold' : ''}
                  ${inMonth && !isStart && !isEnd && !inRange && !isToday ? 'text-gray-700' : ''}
                `}
              >
                {format(d, 'd')}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const displayValue = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'dd MMM yyyy')} — ${format(endDate, 'dd MMM yyyy')}`
    }
    if (startDate) {
      return `${format(startDate, 'dd MMM yyyy')} — Select return date`
    }
    return ''
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="input flex items-center cursor-pointer gap-2"
      >
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={startDate ? 'text-gray-900' : 'text-gray-400'}>
          {displayValue() || 'Select travel dates'}
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 left-0 right-0 sm:right-auto sm:w-[560px]">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm text-gray-500">
              {selectingEnd ? 'Select return date' : 'Select departure date'}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderMonth(currentMonth)}
            {renderMonth(addMonths(currentMonth, 1))}
          </div>
          {startDate && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">{displayValue()}</span>
              <button
                type="button"
                onClick={() => {
                  onDepartureChange('')
                  onReturnChange('')
                  setSelectingEnd(false)
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
