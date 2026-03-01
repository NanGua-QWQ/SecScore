import { Layout, Menu, Card, Tag, Button, Space, message } from 'antd'
import {
  UserOutlined,
  SettingOutlined,
  HistoryOutlined,
  UnorderedListOutlined,
  HomeOutlined,
  SyncOutlined,
  FileTextOutlined,
  CloudOutlined,
  UploadOutlined
} from '@ant-design/icons'
import { useState, useEffect } from 'react'
import appLogo from '../assets/logoHD.svg'

const { Sider } = Layout

interface SidebarProps {
  activeMenu: string
  permission: 'admin' | 'points' | 'view'
  onMenuChange: (value: string) => void
}

interface DbStatus {
  type: 'sqlite' | 'postgresql'
  connected: boolean
  error?: string
}

export function Sidebar({ activeMenu, permission, onMenuChange }: SidebarProps): React.JSX.Element {
  const [dbStatus, setDbStatus] = useState<DbStatus>({ type: 'sqlite', connected: true })
  const [syncLoading, setSyncLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    loadDbStatus()
    const handleStatusChange = () => {
      loadDbStatus()
    }
    if ((window as any).api) {
      const unsubscribe = (window as any).api.onSettingChanged((change) => {
        if (change.key === 'pg_connection_status') {
          handleStatusChange()
        }
      })
      return unsubscribe
    }
  }, [])

  const loadDbStatus = async () => {
    if (!(window as any).api) return
    try {
      const res = await (window as any).api.dbGetStatus()
      if (res.success && res.data) {
        setDbStatus(res.data)
      }
    } catch (e) {
      console.error('Failed to load database status:', e)
    }
  }

  const handleSync = async () => {
    if (!(window as any).api) return
    setSyncLoading(true)
    try {
      await loadDbStatus()
    } catch (e) {
      console.error('Failed to sync database status:', e)
    } finally {
      setSyncLoading(false)
    }
  }

  const [forceSyncLoading, setForceSyncLoading] = useState(false)

  const handleForceSync = async () => {
    if (!(window as any).api) return

    const statusRes = await (window as any).api.dbGetStatus()
    if (!statusRes.success || !statusRes.data) {
      messageApi.error('获取数据库状态失败')
      return
    }

    if (statusRes.data.type !== 'postgresql') {
      messageApi.error('当前不是远程数据库模式，请重启应用后重试')
      return
    }

    if (!statusRes.data.connected) {
      messageApi.error('数据库未连接')
      return
    }

    setForceSyncLoading(true)
    try {
      const res = await (window as any).api.dbSync()
      if (res.success && res.data?.success) {
        messageApi.success('同步成功')
      } else {
        messageApi.error(res.data?.message || res.message || '同步失败')
      }
    } catch (e: any) {
      messageApi.error(e?.message || '同步失败')
    } finally {
      setForceSyncLoading(false)
    }
  }

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '主页'
    },
    {
      key: 'students',
      icon: <UserOutlined />,
      label: '学生管理',
      disabled: permission !== 'admin'
    },
    {
      key: 'score',
      icon: <HistoryOutlined />,
      label: '积分管理'
    },
    {
      key: 'auto-score',
      icon: <SyncOutlined />,
      label: '自动加分'
    },
    {
      key: 'leaderboard',
      icon: <UnorderedListOutlined />,
      label: '排行榜'
    },
    {
      key: 'settlements',
      icon: <FileTextOutlined />,
      label: '结算历史'
    },
    {
      key: 'reasons',
      icon: <UnorderedListOutlined />,
      label: '理由管理',
      disabled: permission !== 'admin'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      disabled: permission !== 'admin'
    }
  ]

  return (
    <Sider
      className="ss-sidebar"
      width={200}
      style={{
        backgroundColor: 'var(--ss-sidebar-bg)',
        borderRight: '1px solid var(--ss-border-color)',
        display: 'flex',
        flexDirection: 'column'
      }}
      theme="light"
    >
      <div
        style={
          {
            padding: '32px 24px 16px',
            textAlign: 'center',
            WebkitAppRegion: 'drag',
            userSelect: 'none',
            flexShrink: 0
          } as React.CSSProperties
        }
      >
        <img
          src={appLogo}
          style={{ width: '48px', height: '48px', marginBottom: '12px' }}
          alt="logo"
        />
        <h2
          style={{
            color: 'var(--ss-sidebar-text, var(--ss-text-main))',
            margin: 0,
            fontSize: '20px'
          }}
        >
          SecScore
        </h2>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--ss-sidebar-text, var(--ss-text-main))',
            opacity: 0.8,
            marginTop: '4px'
          }}
        >
          教育积分管理
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Menu
          mode="inline"
          selectedKeys={[activeMenu]}
          onClick={({ key }) => onMenuChange(key)}
          style={{
            width: '100%',
            border: 'none',
            backgroundColor: 'transparent'
          }}
          items={menuItems}
        />
      </div>

      {dbStatus.type === 'postgresql' && (
        <Card
          size="small"
          style={{
            margin: '8px',
            backgroundColor: 'var(--ss-card-bg)',
            border: '1px solid var(--ss-border-color)'
          }}
          bodyStyle={{ padding: '12px' }}
        >
          {contextHolder}
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space size={4}>
                <CloudOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
                <span style={{ fontSize: '12px', fontWeight: 500 }}>远程数据库</span>
              </Space>
              <Tag
                color={dbStatus.connected ? 'success' : 'error'}
                style={{ margin: 0, fontSize: '10px' }}
              >
                {dbStatus.connected ? '已连接' : '未连接'}
              </Tag>
            </div>
            <Button
              type="text"
              size="small"
              icon={<SyncOutlined spin={syncLoading} />}
              onClick={handleSync}
              loading={syncLoading}
              style={{
                width: '100%',
                height: '24px',
                fontSize: '12px',
                padding: '0 8px',
                color: 'var(--ss-text-secondary)'
              }}
            >
              刷新状态
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<UploadOutlined />}
              onClick={handleForceSync}
              loading={forceSyncLoading}
              disabled={!dbStatus.connected}
              style={{
                width: '100%',
                height: '24px',
                fontSize: '12px',
                padding: '0 8px'
              }}
            >
              立即同步
            </Button>
          </Space>
        </Card>
      )}
    </Sider>
  )
}
