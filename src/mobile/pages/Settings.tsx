import { useState } from 'react'
import { Card, Input, Button, List, Switch, Toast } from 'antd-mobile'
import { useTheme, useApi } from '../App'

export function MobileSettings(): React.JSX.Element {
  const { isDark, toggleTheme } = useTheme()
  const { config, setConfig } = useApi()
  const [apiUrl, setApiUrl] = useState(config.baseUrl)
  const [testing, setTesting] = useState(false)

  const handleSaveApiUrl = () => {
    setConfig({ baseUrl: apiUrl })
    Toast.show({ content: '已保存服务器地址', icon: 'success' })
  }

  const handleTestConnection = async () => {
    if (!apiUrl) {
      Toast.show({ content: '请输入服务器地址', icon: 'fail' })
      return
    }

    setTesting(true)
    try {
      const res = await fetch(`${apiUrl}/api/students`)
      if (res.ok) {
        Toast.show({ content: '连接成功', icon: 'success' })
      } else {
        Toast.show({ content: '连接失败', icon: 'fail' })
      }
    } catch {
      Toast.show({ content: '连接失败', icon: 'fail' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ padding: '12px' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>设置</h2>

      <Card style={{ marginBottom: '12px' }}>
        <List header="外观">
          <List.Item extra={<Switch checked={isDark} onChange={toggleTheme} />}>深色模式</List.Item>
        </List>
      </Card>

      <Card style={{ marginBottom: '12px' }}>
        <List header="服务器配置">
          <div style={{ padding: '12px' }}>
            <div style={{ marginBottom: '8px', color: '#666', fontSize: '12px' }}>
              输入桌面端 SecScore 的 HTTP 服务地址
            </div>
            <Input
              placeholder="http://192.168.1.100:3000"
              value={apiUrl}
              onChange={setApiUrl}
              style={{ marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button color="primary" size="small" onClick={handleSaveApiUrl}>
                保存
              </Button>
              <Button size="small" loading={testing} onClick={handleTestConnection}>
                测试连接
              </Button>
            </div>
          </div>
        </List>
      </Card>

      <Card>
        <List header="关于">
          <List.Item>SecScore 移动端</List.Item>
          <List.Item description="连接桌面端进行积分操作">版本 1.0.0</List.Item>
        </List>
      </Card>
    </div>
  )
}
