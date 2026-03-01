import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Layout, TabBar } from 'antd-mobile'
import {
  HomeOutlined,
  PlusCircleOutlined,
  TrophyOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useTheme } from '../App'
import { Switch } from 'antd'

const { Content } = Layout

const tabs = [
  { key: '/', title: '主页', icon: <HomeOutlined /> },
  { key: '/score', title: '积分', icon: <PlusCircleOutlined /> },
  { key: '/leaderboard', title: '排行', icon: <TrophyOutlined /> },
  { key: '/settings', title: '设置', icon: <SettingOutlined /> }
]

export function MobileLayout(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  return (
    <Layout
      style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5'
      }}
    >
      <Content style={{ paddingBottom: '50px' }}>
        <Outlet />
      </Content>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDark ? '#2a2a2a' : '#fff',
          borderTop: `1px solid ${isDark ? '#333' : '#eee'}`
        }}
      >
        <TabBar
          activeKey={location.pathname}
          onChange={(key) => navigate(key)}
          items={tabs.map((tab) => ({
            key: tab.key,
            title: tab.title,
            icon: tab.icon
          }))}
          style={{
            '--color': isDark ? '#999' : '#666',
            '--active-color': '#1890ff',
            backgroundColor: 'transparent'
          }}
        />
      </div>
    </Layout>
  )
}
