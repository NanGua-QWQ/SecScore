import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { themeConfig } from '../../../preload/types'
import { generateColorMap } from '../utils/color'

interface themeContextType {
  currentTheme: themeConfig | null
  setTheme: (id: string) => Promise<void>
  themes: themeConfig[]
}

const ThemeContext = createContext<themeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<themeConfig | null>(null)
  const [themes, setThemes] = useState<themeConfig[]>([])
  const appliedStyleKeysRef = useRef<string[]>([])
  const currentThemeRef = useRef<themeConfig | null>(null)

  const applyThemeConfig = useCallback((theme: themeConfig) => {
    const { tdesign, custom } = theme.config
    const root = document.documentElement
    const prevKeys = appliedStyleKeysRef.current
    for (const k of prevKeys) root.style.removeProperty(k)
    const nextKeys: string[] = []

    root.setAttribute('theme-mode', theme.mode)

    if (tdesign.brandColor) {
      const colorMap = generateColorMap(tdesign.brandColor, theme.mode)
      Object.entries(colorMap).forEach(([key, value]) => {
        root.style.setProperty(key, value)
        nextKeys.push(key)
      })

      root.style.setProperty('--ant-color-primary', tdesign.brandColor)
      nextKeys.push('--ant-color-primary')

      const hex = tdesign.brandColor.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)

      root.style.setProperty('--ant-color-primary-hover', `rgba(${r}, ${g}, ${b}, 0.85)`)
      root.style.setProperty('--ant-color-primary-active', `rgba(${r}, ${g}, ${b}, 0.7)`)
      root.style.setProperty('--ant-color-primary-bg', `rgba(${r}, ${g}, ${b}, 0.1)`)
      root.style.setProperty('--ant-color-primary-bg-hover', `rgba(${r}, ${g}, ${b}, 0.2)`)
      root.style.setProperty('--ant-color-primary-border', `rgba(${r}, ${g}, ${b}, 0.3)`)

      nextKeys.push('--ant-color-primary-hover')
      nextKeys.push('--ant-color-primary-active')
      nextKeys.push('--ant-color-primary-bg')
      nextKeys.push('--ant-color-primary-bg-hover')
      nextKeys.push('--ant-color-primary-border')
    }

    if (tdesign.warningColor) {
      root.style.setProperty('--ant-color-warning', tdesign.warningColor)
      nextKeys.push('--ant-color-warning')
    }
    if (tdesign.errorColor) {
      root.style.setProperty('--ant-color-error', tdesign.errorColor)
      nextKeys.push('--ant-color-error')
    }
    if (tdesign.successColor) {
      root.style.setProperty('--ant-color-success', tdesign.successColor)
      nextKeys.push('--ant-color-success')
    }

    Object.entries(custom).forEach(([key, value]) => {
      root.style.setProperty(key, value)
      nextKeys.push(key)
    })

    appliedStyleKeysRef.current = nextKeys
  }, [])

  const loadThemes = useCallback(async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.getThemes()
    if (res.success && res.data) {
      setThemes(res.data)
    }
  }, [])

  const loadCurrentTheme = useCallback(async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.getCurrentTheme()
    if (res.success && res.data) {
      setCurrentTheme(res.data)
      currentThemeRef.current = res.data
      applyThemeConfig(res.data)
    }
  }, [applyThemeConfig])

  useEffect(() => {
    if (!(window as any).api) return
    ;(async () => {
      await loadThemes()
      await loadCurrentTheme()
    })()

    const unsubscribe = (window as any).api.onThemeChanged((theme) => {
      setCurrentTheme(theme)
      currentThemeRef.current = theme
      applyThemeConfig(theme)
      loadThemes()
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [applyThemeConfig, loadCurrentTheme, loadThemes])

  const setTheme = async (id: string) => {
    const res = await (window as any).api.setTheme(id)
    if (res.success) {
      await loadCurrentTheme()
    }
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
