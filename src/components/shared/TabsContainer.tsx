import type { ReactNode } from 'react'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
  count?: number
}

interface TabsContainerProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  children: ReactNode
}

export default function TabsContainer({ tabs, activeTab, onChange, children }: TabsContainerProps) {
  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}
