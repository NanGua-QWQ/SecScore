import { ConfigProvider, theme as antTheme, Layout, message } from 'antd'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { MobileHome } from './pages/Home'
import { MobileScore } from './pages/Score'
import { MobileLeaderboard } from './pages/Leaderboard'
import { MobileSettings } from './pages/Settings'
import { MobileLayout } from './components/Layout'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {}
})

export const useTheme = () => useContext(ThemeContext)

interface ApiConfig {
  baseUrl: string
}

interface ApiContextType {
  api: {
    get: (path: string) => Promise<any>
    post: (path: string, data?: any) => Promise<any>
    put: (path: string, data?: any) => Promise<any>
    del: (path: string) => Promise<any>
  }
  config: ApiConfig
  setConfig: (config: ApiConfig) => void
}

const ApiContext = createContext<ApiContextType | null>(null)

export const useApi = () => {
  const ctx = useContext(ApiContext)
  if (!ctx) throw new Error('useApi must be used within ApiProvider')
  return ctx
}

function App(): React.JSX.Element {
  const [isDark, setIsDark] = useState(false)
  const [apiConfig, setApiConfig] = useState<ApiConfig>({ baseUrl: '' })
  const [messageApi, messageHolder] = message.useMessage()

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') setIsDark(true)

    const savedApiUrl = localStorage.getItem('apiUrl')
    if (savedApiUrl) setApiConfig({ baseUrl: savedApiUrl })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('theme-mode', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    if (apiConfig.baseUrl) {
      localStorage.setItem('apiUrl', apiConfig.baseUrl)
    }
  }, [apiConfig])

  const toggleTheme = () => setIsDark((prev) => !prev)

  const api = {
    get: async (path: string) => {
      if (!apiConfig.baseUrl) throw new Error('API URL not configured')
      const res = await fetch(`${apiConfig.baseUrl}${path}`)
      return res.json()
    },
    post: async (path: string, data?: any) => {
      if (!apiConfig.baseUrl) throw new Error('API URL not configured')
      const res = await fetch(`${apiConfig.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return res.json()
    },
    put: async (path: string, data?: any) => {
      if (!apiConfig.baseUrl) throw new Error('API URL not configured')
      const res = await fetch(`${apiConfig.baseUrl}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return res.json()
    },
    del: async (path: string) => {
      if (!apiConfig.baseUrl) throw new Error('API URL not configured')
      const res = await fetch(`${apiConfig.baseUrl}${path}`, { method: 'DELETE' })
      return res.json()
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff'
        }
      }}
    >
      {messageHolder}
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <ApiContext.Provider value={{ api, config: apiConfig, setConfig: setApiConfig }}>
          <HashRouter>
            <Routes>
              <Route element={<MobileLayout />}>
                <Route path="/" element={<MobileHome />} />
                <Route path="/score" element={<MobileScore />} />
                <Route path="/leaderboard" element={<MobileLeaderboard />} />
                <Route path="/settings" element={<MobileSettings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </ApiContext.Provider>
      </ThemeContext.Provider>
    </ConfigProvider>
  )
}

export default App
