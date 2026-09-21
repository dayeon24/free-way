import { useState, useEffect, createContext, useContext } from 'react'

const STORAGE_KEY = 'freeway_accessibility'
const DEFAULTS = { fontSize: 'medium', highContrast: false }

export const AccessibilityContext = createContext(null)

export function useAccessibility() {
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
    } catch {
      return DEFAULTS
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    document.documentElement.dataset.fontSize = settings.fontSize
    document.documentElement.dataset.highContrast = settings.highContrast ? 'true' : 'false'
  }, [settings])

  function update(patch) {
    setSettings(prev => ({ ...prev, ...patch }))
  }

  return { settings, update }
}

export function useAccessibilityContext() {
  return useContext(AccessibilityContext)
}
