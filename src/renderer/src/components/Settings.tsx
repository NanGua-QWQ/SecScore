import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Tabs, Card, Form, Select, Input, Button, Space, Divider, Tag, Modal, message } from 'antd'
import { useTheme } from '../contexts/ThemeContext'
import { useThemeEditor } from '../contexts/ThemeEditorContext'

type permissionLevel = 'admin' | 'points' | 'view'
type appSettings = {
  is_wizard_completed: boolean
  log_level: 'debug' | 'info' | 'warn' | 'error'
  window_zoom?: string
  auto_score_enabled?: boolean
}

export const Settings: React.FC<{ permission: permissionLevel }> = ({ permission }) => {
  const { themes, currentTheme, setTheme } = useTheme()
  const { startEditing } = useThemeEditor()
  const [activeTab, setActiveTab] = useState('appearance')
  const [settings, setSettings] = useState<appSettings>({
    is_wizard_completed: false,
    log_level: 'info',
    window_zoom: '1.0'
  })

  const [securityStatus, setSecurityStatus] = useState<{
    permission: permissionLevel
    hasAdminPassword: boolean
    hasPointsPassword: boolean
    hasRecoveryString: boolean
  } | null>(null)

  const [adminPassword, setAdminPassword] = useState('')
  const [pointsPassword, setPointsPassword] = useState('')
  const [recoveryToReset, setRecoveryToReset] = useState('')

  const [recoveryDialogVisible, setRecoveryDialogVisible] = useState(false)
  const [recoveryDialogHeader, setRecoveryDialogHeader] = useState('')
  const [recoveryDialogString, setRecoveryDialogString] = useState('')
  const [recoveryDialogFilename, setRecoveryDialogFilename] = useState('')

  const [logsDialogVisible, setLogsDialogVisible] = useState(false)
  const [logsText, setLogsText] = useState('')
  const [logsLoading, setLogsLoading] = useState(false)

  const [clearDialogVisible, setClearDialogVisible] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)

  const importInputRef = useRef<HTMLInputElement | null>(null)

  const [settleLoading, setSettleLoading] = useState(false)
  const [settleDialogVisible, setSettleDialogVisible] = useState(false)

  const [urlRegisterLoading, setUrlRegisterLoading] = useState(false)
  const canAdmin = permission === 'admin'
  const [messageApi, contextHolder] = message.useMessage()

  const [pgConnectionString, setPgConnectionString] = useState('')
  const [pgConnectionStatus, setPgConnectionStatus] = useState<{
    connected: boolean
    type: 'sqlite' | 'postgresql'
    error?: string
  }>({ connected: true, type: 'sqlite' })
  const [pgTestLoading, setPgTestLoading] = useState(false)
  const [pgSwitchLoading, setPgSwitchLoading] = useState(false)

  const permissionTag = useMemo(() => {
    return (
      <Tag
        color={permission === 'admin' ? 'success' : permission === 'points' ? 'warning' : 'default'}
      >
        {permission === 'admin' ? '管理权限' : permission === 'points' ? '积分权限' : '只读'}
      </Tag>
    )
  }, [permission])

  const emitDataUpdated = (category: 'events' | 'students' | 'reasons' | 'all') => {
    window.dispatchEvent(new CustomEvent('ss:data-updated', { detail: { category } }))
  }

  const loadAll = async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.getAllSettings()
    if (res.success && res.data) {
      setSettings(res.data)
      setPgConnectionString(res.data.pg_connection_string || '')
      setPgConnectionStatus(res.data.pg_connection_status || { connected: true, type: 'sqlite' })
    }
    const authRes = await (window as any).api.authGetStatus()
    if (authRes.success && authRes.data) setSecurityStatus(authRes.data)
  }

  useEffect(() => {
    loadAll()
    if (!(window as any).api) return
    const unsubscribe = (window as any).api.onSettingChanged((change: any) => {
      setSettings((prev) => {
        if (change?.key === 'log_level') return { ...prev, log_level: change.value }
        if (change?.key === 'is_wizard_completed')
          return { ...prev, is_wizard_completed: change.value }
        if (change?.key === 'window_zoom') return { ...prev, window_zoom: change.value }
        if (change?.key === 'auto_score_enabled')
          return { ...prev, auto_score_enabled: change.value }
        return prev
      })
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [])

  const showLogs = async () => {
    if (!(window as any).api) return
    setLogsLoading(true)
    const res = await (window as any).api.queryLogs(200)
    setLogsLoading(false)
    if (!res.success) {
      messageApi.error(res.message || '读取日志失败')
      return
    }
    setLogsText((res.data || []).join('\n'))
    setLogsDialogVisible(true)
  }

  const exportLogs = async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.queryLogs(5000)
    if (!res.success) {
      messageApi.error(res.message || '读取日志失败')
      return
    }
    const dateTime = new Date().toISOString().replace(/[:.]/g, '-')
    downloadTextFile(`secscore_logs_${dateTime}.txt`, `${(res.data || []).join('\n')}\n`)
    messageApi.success('日志已导出')
  }

  const downloadTextFile = (filename: string, text: string) => {
    const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const showRecoveryDialog = (header: string, recoveryString: string) => {
    const date = new Date().toISOString().slice(0, 10)
    const filename = `secscore_recovery_${date}.txt`
    setRecoveryDialogHeader(header)
    setRecoveryDialogString(recoveryString)
    setRecoveryDialogFilename(filename)
    setRecoveryDialogVisible(true)
  }

  const exportJson = async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.exportDataJson()
    if (!res.success || !res.data) {
      messageApi.error(res.message || '导出失败')
      return
    }
    const blob = new Blob([res.data], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `secscore_export_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    messageApi.success('导出成功')
  }

  const importJson = async (file: File) => {
    if (!(window as any).api) return
    const text = await file.text()
    const res = await (window as any).api.importDataJson(text)
    if (res.success) {
      messageApi.success('导入成功，正在刷新')
      setTimeout(() => window.location.reload(), 300)
    } else {
      messageApi.error(res.message || '导入失败')
    }
  }

  const savePasswords = async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.authSetPasswords({
      adminPassword: adminPassword ? adminPassword : undefined,
      pointsPassword: pointsPassword ? pointsPassword : undefined
    })
    if (res.success) {
      setAdminPassword('')
      setPointsPassword('')
      await loadAll()
      if (res.data?.recoveryString) {
        showRecoveryDialog('找回字符串（请妥善保存）', res.data.recoveryString)
      } else {
        messageApi.success('密码已更新')
      }
    } else {
      messageApi.error(res.message || '更新失败')
    }
  }

  const generateRecovery = async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.authGenerateRecovery()
    if (!res.success || !res.data?.recoveryString) {
      messageApi.error(res.message || '生成失败')
      return
    }
    await loadAll()
    showRecoveryDialog('新的找回字符串（请妥善保存）', res.data.recoveryString)
  }

  const resetByRecovery = async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.authResetByRecovery(recoveryToReset)
    if (!res.success || !res.data?.recoveryString) {
      messageApi.error(res.message || '重置失败')
      return
    }
    setRecoveryToReset('')
    await loadAll()
    showRecoveryDialog('密码已清空，新的找回字符串', res.data.recoveryString)
  }

  const clearAllPasswords = () => {
    setClearDialogVisible(true)
  }

  const handleConfirmClearAll = async () => {
    if (!(window as any).api) return
    setClearLoading(true)
    const res = await (window as any).api.authClearAll()
    setClearLoading(false)
    if (res.success) {
      messageApi.success('已清空')
      await loadAll()
      setClearDialogVisible(false)
    } else {
      messageApi.error(res.message || '清空失败')
    }
  }

  const confirmSettlement = () => {
    setSettleDialogVisible(true)
  }

  const testPgConnection = async () => {
    if (!(window as any).api) return
    if (!pgConnectionString) {
      messageApi.warning('请输入 PostgreSQL 连接字符串')
      return
    }
    setPgTestLoading(true)
    try {
      const res = await (window as any).api.dbTestConnection(pgConnectionString)
      if (res.success && res.data?.success) {
        messageApi.success('连接测试成功')
      } else {
        messageApi.error(res.data?.error || res.message || '连接测试失败')
      }
    } catch (e: any) {
      messageApi.error(e?.message || '连接测试失败')
    } finally {
      setPgTestLoading(false)
    }
  }

  const switchToPg = async () => {
    if (!(window as any).api) return
    setPgSwitchLoading(true)
    try {
      const res = await (window as any).api.dbSwitchConnection(pgConnectionString)
      if (res.success) {
        messageApi.success(
          `已切换到 ${res.data?.type === 'postgresql' ? 'PostgreSQL' : 'SQLite'} 数据库`
        )
        await loadAll()
      } else {
        messageApi.error(res.message || '切换失败')
      }
    } catch (e: any) {
      messageApi.error(e?.message || '切换失败')
    } finally {
      setPgSwitchLoading(false)
    }
  }

  const switchToSQLite = async () => {
    if (!(window as any).api) return
    setPgSwitchLoading(true)
    try {
      const res = await (window as any).api.dbSwitchConnection('')
      if (res.success) {
        messageApi.success('已切换到本地 SQLite 数据库')
        setPgConnectionString('')
        await loadAll()
      } else {
        messageApi.error(res.message || '切换失败')
      }
    } catch (e: any) {
      messageApi.error(e?.message || '切换失败')
    } finally {
      setPgSwitchLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()

  const tabItems = [
    {
      key: 'appearance',
      label: '外观',
      children: (
        <Card style={{ backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}>
          <Form layout="horizontal" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
            <Form.Item label="当前主题">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Select
                  value={currentTheme?.id}
                  onChange={(v) => setTheme(v as string)}
                  style={{ width: '200px' }}
                  options={themes.map((t) => ({ value: t.id, label: t.name }))}
                />
                <Button onClick={() => startEditing(currentTheme || undefined)}>编辑</Button>
                <Button type="link" onClick={() => startEditing()}>
                  新建主题
                </Button>
              </div>
            </Form.Item>

            <Form.Item label="界面缩放">
              <Select
                value={settings.window_zoom || '1.0'}
                onChange={async (v) => {
                  if (!(window as any).api) return
                  const next = String(v)
                  const res = await (window as any).api.setSetting('window_zoom', next)
                  if (res.success) {
                    setSettings((prev) => ({ ...prev, window_zoom: next }))
                    messageApi.success('界面缩放已更新')
                  } else {
                    messageApi.error(res.message || '更新失败')
                  }
                }}
                style={{ width: '320px' }}
                disabled={!canAdmin}
                options={[
                  { value: '0.7', label: '70% (较小)' },
                  { value: '0.8', label: '80%' },
                  { value: '0.9', label: '90%' },
                  { value: '1.0', label: '100% (默认)' },
                  { value: '1.1', label: '110%' },
                  { value: '1.2', label: '120%' },
                  { value: '1.3', label: '130%' },
                  { value: '1.5', label: '150% (较大)' }
                ]}
              />
              <div
                style={{ marginTop: '4px', fontSize: '12px', color: 'var(--ss-text-secondary)' }}
              >
                调节应用界面的整体大小。
              </div>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'security',
      label: '安全',
      children: (
        <>
          <Card
            style={{
              backgroundColor: 'var(--ss-card-bg)',
              color: 'var(--ss-text-main)',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600 }}>密码保护系统</div>
              <Space>
                <Tag color={securityStatus?.hasAdminPassword ? 'success' : 'default'}>
                  管理密码 {securityStatus?.hasAdminPassword ? '已设置' : '未设置'}
                </Tag>
                <Tag color={securityStatus?.hasPointsPassword ? 'success' : 'default'}>
                  积分密码 {securityStatus?.hasPointsPassword ? '已设置' : '未设置'}
                </Tag>
                <Tag color={securityStatus?.hasRecoveryString ? 'success' : 'default'}>
                  找回字符串 {securityStatus?.hasRecoveryString ? '已生成' : '未生成'}
                </Tag>
              </Space>
            </div>

            <Divider />

            <Form layout="horizontal" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
              <Form.Item label="管理密码">
                <Input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="输入6位数字（留空则不修改）"
                  maxLength={6}
                  disabled={!canAdmin && Boolean(securityStatus?.hasAdminPassword)}
                />
              </Form.Item>

              <Form.Item label="积分密码">
                <Input
                  value={pointsPassword}
                  onChange={(e) => setPointsPassword(e.target.value)}
                  placeholder="输入6位数字（留空则不修改）"
                  maxLength={6}
                  disabled={!canAdmin && Boolean(securityStatus?.hasAdminPassword)}
                />
              </Form.Item>

              <Form.Item label="操作">
                <Space>
                  <Button
                    type="primary"
                    onClick={savePasswords}
                    disabled={!canAdmin && Boolean(securityStatus?.hasAdminPassword)}
                  >
                    保存密码
                  </Button>
                  <Button
                    onClick={generateRecovery}
                    disabled={!canAdmin && Boolean(securityStatus?.hasAdminPassword)}
                  >
                    生成找回字符串
                  </Button>
                  <Button danger onClick={clearAllPasswords} disabled={!canAdmin}>
                    清空所有密码
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          <Card style={{ backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}>
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>找回字符串重置</div>
            <Space>
              <Input
                value={recoveryToReset}
                onChange={(e) => setRecoveryToReset(e.target.value)}
                placeholder="输入找回字符串"
                style={{ width: '420px' }}
              />
              <Button type="primary" onClick={resetByRecovery}>
                重置密码
              </Button>
            </Space>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ss-text-secondary)' }}>
              重置会清空管理/积分密码，并生成新的找回字符串。
            </div>
          </Card>
        </>
      )
    },
    {
      key: 'database',
      label: '数据库连接',
      children: (
        <>
          <Card
            style={{
              backgroundColor: 'var(--ss-card-bg)',
              color: 'var(--ss-text-main)',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>当前数据库状态</div>
            <Space>
              <Tag color={pgConnectionStatus.type === 'postgresql' ? 'blue' : 'green'}>
                {pgConnectionStatus.type === 'postgresql'
                  ? 'PostgreSQL 远程数据库'
                  : 'SQLite 本地数据库'}
              </Tag>
              <Tag color={pgConnectionStatus.connected ? 'success' : 'error'}>
                {pgConnectionStatus.connected ? '已连接' : '未连接'}
              </Tag>
              {pgConnectionStatus.error && (
                <span style={{ color: 'var(--ant-color-error, #ff4d4f)', fontSize: '12px' }}>
                  {pgConnectionStatus.error}
                </span>
              )}
            </Space>
          </Card>

          <Card
            style={{
              backgroundColor: 'var(--ss-card-bg)',
              color: 'var(--ss-text-main)',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>PostgreSQL 远程连接</div>
            <div
              style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--ss-text-secondary)' }}
            >
              输入 PostgreSQL 连接字符串以连接远程数据库，支持多端同步操作。
            </div>
            <Space.Compact style={{ width: '100%', marginBottom: '12px' }}>
              <Input
                value={pgConnectionString}
                onChange={(e) => setPgConnectionString(e.target.value)}
                placeholder="postgresql://user:password@host:port/database?sslmode=require"
                style={{ flex: 1 }}
                disabled={!canAdmin}
              />
              <Button
                onClick={testPgConnection}
                loading={pgTestLoading}
                disabled={!canAdmin || !pgConnectionString}
              >
                测试连接
              </Button>
            </Space.Compact>
            <div
              style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--ss-text-secondary)' }}
            >
              示例：postgresql://xxxxxx_xxxxx:xxxxxxxx@xx-xxx.xxx.neon.xxxx/xxxxdxx?sslmode=require
            </div>
            <Space>
              <Button
                type="primary"
                onClick={switchToPg}
                loading={pgSwitchLoading}
                disabled={!canAdmin || !pgConnectionString}
              >
                切换到 PostgreSQL
              </Button>
              <Button
                onClick={switchToSQLite}
                loading={pgSwitchLoading}
                disabled={!canAdmin || pgConnectionStatus.type === 'sqlite'}
              >
                切换到本地 SQLite
              </Button>
            </Space>
          </Card>

          <Card style={{ backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}>
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>多端同步说明</div>
            <div style={{ fontSize: '13px', color: 'var(--ss-text-secondary)', lineHeight: '1.8' }}>
              <p>• 使用 PostgreSQL 远程数据库可以实现多端数据同步。</p>
              <p>• 系统内置操作队列机制，确保多端同时操作时数据一致性。</p>
              <p>• 切换数据库后需要重启应用以生效。</p>
              <p>• 建议使用云数据库服务（如 Neon、Supabase、AWS RDS 等）。</p>
            </div>
          </Card>
        </>
      )
    },
    {
      key: 'data',
      label: '数据管理',
      children: (
        <>
          <Card
            title="结算"
            style={{
              backgroundColor: 'var(--ss-card-bg)',
              color: 'var(--ss-text-main)',
              marginBottom: '16px'
            }}
          >
            <Space align="center">
              <Button
                danger
                disabled={!canAdmin}
                loading={settleLoading}
                onClick={confirmSettlement}
              >
                结算并重新开始
              </Button>
              <div style={{ fontSize: '12px', color: 'var(--ss-text-secondary)' }}>
                将当前未结算记录划分为一个阶段，并将所有学生积分清零。
              </div>
            </Space>
          </Card>

          <Card
            style={{
              backgroundColor: 'var(--ss-card-bg)',
              color: 'var(--ss-text-main)',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>导入 / 导出</div>
            <Space>
              <Button type="primary" onClick={exportJson}>
                导出 JSON
              </Button>
              <Button onClick={() => importInputRef.current?.click()}>导入 JSON</Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) importJson(file)
                  if (importInputRef.current) importInputRef.current.value = ''
                }}
              />
            </Space>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ss-text-secondary)' }}>
              导入会覆盖现有学生/理由/积分记录/设置（安全相关设置不会导入）。
            </div>
          </Card>

          <Card
            title="日志"
            style={{ backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}
          >
            <Form layout="horizontal" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
              <Form.Item label="日志级别">
                <Select
                  value={settings.log_level}
                  onChange={async (v) => {
                    if (!(window as any).api) return
                    const next = String(v) as any
                    const res = await (window as any).api.setSetting('log_level', next)
                    if (res.success) {
                      setSettings((prev) => ({ ...prev, log_level: next }))
                      messageApi.success('日志级别已更新')
                    } else {
                      messageApi.error(res.message || '更新失败')
                    }
                  }}
                  style={{ width: '320px' }}
                  options={[
                    { value: 'debug', label: 'DEBUG (调试)' },
                    { value: 'info', label: 'INFO (信息)' },
                    { value: 'warn', label: 'WARN (警告)' },
                    { value: 'error', label: 'ERROR (错误)' }
                  ]}
                />
              </Form.Item>
              <Form.Item label="日志操作">
                <Space>
                  <Button loading={logsLoading} onClick={showLogs}>
                    查看日志
                  </Button>
                  <Button onClick={exportLogs}>导出日志</Button>
                  <Button
                    danger
                    onClick={async () => {
                      if (!(window as any).api) return
                      const res = await (window as any).api.clearLogs()
                      if (res.success) messageApi.success('日志已清空')
                      else messageApi.error(res.message || '清空失败')
                    }}
                  >
                    清空日志
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </>
      )
    },
    {
      key: 'url',
      label: 'URL 链接',
      children: (
        <Card style={{ backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            URL 协议 (secscore://)
          </div>
          <Divider />
          <div
            style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--ss-text-secondary)' }}
          >
            可以通过 URL 链接唤起 SecScore 并执行操作，例如：
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '12px',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", monospace'
            }}
          >
            <div>secscore://settings</div>
            <div>secscore://score</div>
            <div>secscore://sidebar/toggle</div>
          </div>
          <Divider />
          <Space>
            <Button
              type="primary"
              loading={urlRegisterLoading}
              disabled={!canAdmin}
              onClick={async () => {
                if (!(window as any).api) return
                setUrlRegisterLoading(true)
                const res = await (window as any).api.registerUrlProtocol()
                setUrlRegisterLoading(false)
                if (res && res.success) {
                  messageApi.success('URL 协议已注册')
                } else {
                  messageApi.error(res?.message || '注册失败')
                }
              }}
            >
              注册 URL 协议
            </Button>
          </Space>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ss-text-secondary)' }}>
            需要安装版 SecScore，开发模式下可能无效。
          </div>
        </Card>
      )
    },
    {
      key: 'about',
      label: '关于',
      children: (
        <Card style={{ backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>SecScore</div>
          <div style={{ color: 'var(--ss-text-secondary)', marginBottom: '16px' }}>
            教育积分管理
          </div>
          <Divider />
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: '10px' }}>
            <div style={{ color: 'var(--ss-text-secondary)' }}>版本</div>
            <div>v1.0.0</div>
            <div style={{ color: 'var(--ss-text-secondary)' }}>版权</div>
            <div>{'SecScore遵循GPL3.0协议——' + 'CopyRight © 2025-' + currentYear + ' SECTL'}</div>
            <div style={{ color: 'var(--ss-text-secondary)' }}>Electron</div>
            <div>{(window as any).electron?.process?.versions?.electron || '-'}</div>
            <div style={{ color: 'var(--ss-text-secondary)' }}>Chromium</div>
            <div>{(window as any).electron?.process?.versions?.chrome || '-'}</div>
            <div style={{ color: 'var(--ss-text-secondary)' }}>Node</div>
            <div>{(window as any).electron?.process?.versions?.node || '-'}</div>
            <div style={{ color: 'var(--ss-text-secondary)' }}>IPC 状态</div>
            <div>
              <Tag color={(window as any).api ? 'success' : 'error'}>
                {(window as any).api ? '已连接' : '未连接 (Preload 失败)'}
              </Tag>
            </div>
            <div style={{ color: 'var(--ss-text-secondary)' }}>环境</div>
            <div>
              <Tag>{import.meta.env.DEV ? 'Development' : 'Production'}</Tag>
            </div>
          </div>
          <Divider />
          <div style={{ marginTop: '16px' }}>
            <Button
              onClick={() => {
                ;(window as any).api?.toggleDevTools()
              }}
            >
              切换开发者工具
            </Button>
          </div>
        </Card>
      )
    }
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {contextHolder}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}
      >
        <h2 style={{ margin: 0, color: 'var(--ss-text-main)' }}>系统设置</h2>
        {permissionTag}
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Modal
        title={recoveryDialogHeader}
        open={recoveryDialogVisible}
        onCancel={() => setRecoveryDialogVisible(false)}
        footer={
          <Button type="primary" onClick={() => setRecoveryDialogVisible(false)}>
            我已保存
          </Button>
        }
        width="70%"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              wordBreak: 'break-all',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", monospace'
            }}
          >
            {recoveryDialogString}
          </div>
          <Space>
            <Button
              type="primary"
              onClick={() =>
                downloadTextFile(
                  recoveryDialogFilename ||
                    `secscore_recovery_${new Date().toISOString().slice(0, 10)}.txt`,
                  `SecScore 找回字符串: ${recoveryDialogString}\n`
                )
              }
            >
              导出文本文件
            </Button>
          </Space>
          <div style={{ fontSize: '12px', color: 'var(--ss-text-secondary)' }}>
            建议导出后离线保存，遗失将无法找回。
          </div>
        </div>
      </Modal>

      <Modal
        title="系统日志 (最后200条)"
        open={logsDialogVisible}
        onCancel={() => setLogsDialogVisible(false)}
        footer={<Button onClick={() => setLogsDialogVisible(false)}>关闭</Button>}
        width="80%"
      >
        <div
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '12px',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", monospace',
            whiteSpace: 'pre-wrap',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: '10px'
          }}
        >
          {logsText || '暂无日志'}
        </div>
      </Modal>

      <Modal
        title="确认结算并重新开始？"
        open={settleDialogVisible}
        onCancel={() => !settleLoading && setSettleDialogVisible(false)}
        onOk={async () => {
          if (!(window as any).api) return
          setSettleLoading(true)
          const res = await (window as any).api.createSettlement()
          setSettleLoading(false)
          if (res.success && res.data) {
            messageApi.success('结算成功，已重新开始积分')
            emitDataUpdated('all')
            setSettleDialogVisible(false)
          } else {
            messageApi.error(res.message || '结算失败')
          }
        }}
        confirmLoading={settleLoading}
        okText="结算"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>将把当前未结算的积分记录归档为一个阶段，并将所有学生当前积分清零。</div>
          <div style={{ color: 'var(--ss-text-secondary)', fontSize: '12px' }}>
            学生名单不变；结算后的历史在"结算历史"页面查看。
          </div>
        </div>
      </Modal>

      <Modal
        title="确认清空所有密码？"
        open={clearDialogVisible}
        onCancel={() => !clearLoading && setClearDialogVisible(false)}
        onOk={handleConfirmClearAll}
        confirmLoading={clearLoading}
        okText="确认清空"
        okButtonProps={{ danger: true }}
      >
        清空后将关闭保护（无密码时默认视为管理权限）。
      </Modal>
    </div>
  )
}
