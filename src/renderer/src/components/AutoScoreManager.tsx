import { useState, useEffect } from 'react'
import { PlusOutlined, HolderOutlined } from '@ant-design/icons'
import { allTriggers, allActions, triggerRegistry, actionRegistry } from './com.automatically'
import type { TriggerItem, ActionItem } from './com.automatically/types'
import TriggerItemComponent from './com.automatically/TriggerItem'
import ActionItemComponent from './com.automatically/ActionItem'
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Table,
  Space,
  Switch,
  Popconfirm,
  Select,
  Tooltip,
  Pagination
} from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface AutoScoreRule {
  id: number
  enabled: boolean
  name: string
  studentNames: string[]
  lastExecuted?: string
  triggers?: { event: string; value?: string; relation?: 'AND' | 'OR' }[]
  actions?: { event: string; value?: string; reason?: string }[]
}

interface AutoScoreRuleFormValues {
  name: string
  studentNames: string
}

export const AutoScoreManager: React.FC = () => {
  const [rules, setRules] = useState<AutoScoreRule[]>([])
  const [students, setStudents] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(50)
  const [form] = Form.useForm()
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null)
  const [triggerList, setTriggerList] = useState<TriggerItem[]>([])
  const [actionList, setActionList] = useState<ActionItem[]>([])
  const [messageApi, contextHolder] = message.useMessage()

  const fetchRules = async () => {
    if (!(window as any).api) return

    setLoading(true)
    try {
      try {
        const authRes = await (window as any).api.authGetStatus()
        if (!authRes || !authRes.success || authRes.data?.permission !== 'admin') {
          messageApi.error('需要管理员权限以查看自动加分自动化，请先登录管理员账号')
          setLoading(false)
          return
        }
      } catch (e) {
        console.warn('Auth check failed', e)
      }

      const [rulesRes, studentsRes] = await Promise.all([
        (window as any).api.invoke('auto-score:getRules', {}),
        (window as any).api.queryStudents({})
      ])
      if (rulesRes.success) {
        setRules(rulesRes.data)
      } else {
        messageApi.error(rulesRes.message || '获取自动化失败')
      }
      if (studentsRes.success) {
        setStudents(studentsRes.data)
      }
    } catch (error) {
      console.error('Failed to fetch auto score rules:', error)
      messageApi.error('获取自动化失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  const handleSubmit = async () => {
    if (!(window as any).api) return

    const values = form.getFieldsValue(true) as unknown as AutoScoreRuleFormValues

    if (!values.name) {
      messageApi.warning('请填写自动化名称')
      return
    }

    if (triggerList.length === 0) {
      messageApi.warning('请至少添加一个触发器')
      return
    }

    if (actionList.length === 0) {
      messageApi.warning('请至少添加一个行动')
      return
    }

    const studentNames = Array.isArray(values.studentNames) ? values.studentNames : []

    const triggersPayload = triggerList.map((t) => ({
      event: t.eventName,
      value: t.value,
      relation: t.relation
    }))
    const actionsPayload = actionList.map((a) => ({
      event: a.eventName,
      value: a.value,
      reason: a.reason
    }))

    const ruleData = {
      enabled: true,
      name: values.name,
      studentNames,
      triggers: triggersPayload,
      actions: actionsPayload
    }

    try {
      const authRes = await (window as any).api.authGetStatus()
      if (!authRes || !authRes.success || authRes.data?.permission !== 'admin') {
        messageApi.error('需要管理员权限以创建或更新自动加分自动化')
        return
      }
    } catch (e) {
      console.warn('Auth check failed', e)
    }

    try {
      let res
      if (editingRuleId !== null) {
        res = await (window as any).api.invoke('auto-score:updateRule', {
          id: editingRuleId,
          ...ruleData
        })
      } else {
        res = await (window as any).api.invoke('auto-score:addRule', ruleData)
      }

      if (res.success) {
        messageApi.success(editingRuleId !== null ? '自动化更新成功' : '自动化创建成功')
        form.setFieldsValue({
          name: '',
          studentNames: ''
        })
        setEditingRuleId(null)
        setTriggerList([])
        setActionList([])
        fetchRules()
      } else {
        messageApi.error(
          res.message || (editingRuleId !== null ? '更新自动化失败' : '创建自动化失败')
        )
      }
    } catch (error) {
      console.error('Failed to submit auto score rule:', error)
      messageApi.error(editingRuleId !== null ? '更新自动化失败' : '创建自动化失败')
    }
  }

  const handleEdit = (rule: AutoScoreRule) => {
    setEditingRuleId(rule.id)
    form.setFieldsValue({
      name: rule.name,
      studentNames: rule.studentNames.join(', ')
    })
    if (rule.triggers && Array.isArray(rule.triggers)) {
      const mapped = rule.triggers.map((t, idx) => ({
        id: idx + 1,
        eventName: t.event,
        value: t.value ?? '',
        relation: t.relation ?? 'AND'
      }))
      setTriggerList(mapped)
    } else {
      setTriggerList([])
    }
    if (rule.actions && Array.isArray(rule.actions)) {
      const mapped = rule.actions.map((a, idx) => ({
        id: idx + 1,
        eventName: a.event,
        value: a.value ?? '',
        reason: a.reason ?? ''
      }))
      setActionList(mapped)
    } else {
      setActionList([])
    }
  }

  const handleDelete = async (ruleId: number) => {
    if (!(window as any).api) return
    try {
      const authRes = await (window as any).api.authGetStatus()
      if (!authRes || !authRes.success || authRes.data?.permission !== 'admin') {
        messageApi.error('需要管理员权限以删除自动加分自动化')
        return
      }
    } catch (e) {
      console.warn('Auth check failed', e)
    }

    try {
      const res = await (window as any).api.invoke('auto-score:deleteRule', ruleId)
      if (res.success) {
        messageApi.success('自动化删除成功')
        fetchRules()
      } else {
        messageApi.error(res.message || '删除自动化失败')
      }
    } catch (error) {
      console.error('Failed to delete auto score rule:', error)
      messageApi.error('删除自动化失败')
    }
  }

  const handleToggle = async (ruleId: number, enabled: boolean) => {
    if (!(window as any).api) return
    try {
      const authRes = await (window as any).api.authGetStatus()
      if (!authRes || !authRes.success || authRes.data?.permission !== 'admin') {
        messageApi.error('需要管理员权限以启用/禁用自动加分自动化')
        return
      }
    } catch (e) {
      console.warn('Auth check failed', e)
    }

    try {
      const res = await (window as any).api.invoke('auto-score:toggleRule', { ruleId, enabled })
      if (res.success) {
        messageApi.success(enabled ? '自动化已启用' : '自动化已禁用')
        fetchRules()
      } else {
        messageApi.error(res.message || (enabled ? '启用自动化失败' : '禁用自动化失败'))
      }
    } catch (error) {
      console.error('Failed to toggle auto score rule:', error)
      messageApi.error(enabled ? '启用自动化失败' : '禁用自动化失败')
    }
  }

  const handleResetForm = () => {
    form.setFieldsValue({
      name: '',
      studentNames: ''
    })
    setEditingRuleId(null)
    setTriggerList([])
    setActionList([])
  }

  const handleAddTrigger = () => {
    const nextId = triggerList.length ? Math.max(...triggerList.map((t) => t.id)) + 1 : 1
    const defaultTrigger = allTriggers.list[0]
    if (!defaultTrigger) {
      messageApi.error('没有可用的触发器类型，请检查配置')
      return
    }
    setTriggerList((prev) => [
      ...prev,
      {
        id: nextId,
        eventName: defaultTrigger.eventName,
        value: '',
        relation: 'AND'
      }
    ])
  }

  const handleDeleteTrigger = (id: number) => {
    setTriggerList((prev) => prev.filter((t) => t.id !== id))
  }

  const handleTriggerChange = (id: number, eventName: string) => {
    setTriggerList((prev) => prev.map((t) => (t.id === id ? { ...t, eventName, value: '' } : t)))
  }

  const handleTriggerValueChange = (id: number, value: string) => {
    setTriggerList((prev) => prev.map((t) => (t.id === id ? { ...t, value } : t)))
  }

  const handleTriggerRelationChange = (id: number, relation: 'AND' | 'OR') => {
    setTriggerList((prev) => prev.map((t) => (t.id === id ? { ...t, relation } : t)))
  }

  const handleAddAction = () => {
    const nextId = actionList.length ? Math.max(...actionList.map((a) => a.id)) + 1 : 1
    const defaultAction = allActions.list[0]
    if (!defaultAction) {
      messageApi.error('没有可用的行动类型，请检查配置')
      return
    }
    setActionList((prev) => [
      ...prev,
      {
        id: nextId,
        eventName: defaultAction.eventName,
        value: '',
        reason: ''
      }
    ])
  }

  const handleDeleteAction = (id: number) => {
    setActionList((prev) => prev.filter((a) => a.id !== id))
  }

  const handleActionChange = (id: number, eventName: string) => {
    setActionList((prev) => prev.map((a) => (a.id === id ? { ...a, eventName, value: '' } : a)))
  }

  const handleActionValueChange = (id: number, value: string) => {
    setActionList((prev) => prev.map((a) => (a.id === id ? { ...a, value } : a)))
  }

  const handleActionReasonChange = (id: number, reason: string) => {
    setActionList((prev) => prev.map((a) => (a.id === id ? { ...a, reason } : a)))
  }

  const columns: ColumnsType<AutoScoreRule> = [
    {
      key: 'drag',
      title: '排序',
      width: 60,
      render: () => <HolderOutlined style={{ cursor: 'move' }} />
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean, row) => (
        <Switch checked={enabled} onChange={(value) => handleToggle(row.id, value)} size="small" />
      )
    },
    { title: '自动化名称', dataIndex: 'name', key: 'name', width: 150 },
    {
      title: '触发器',
      dataIndex: 'triggers',
      key: 'triggers',
      width: 150,
      render: (triggers: AutoScoreRule['triggers']) => {
        if (!triggers || triggers.length === 0) {
          return <span>无</span>
        }
        const triggerLabels = triggers.map((t) => {
          const def = triggerRegistry.get(t.event)
          return def?.label || t.event
        })
        return (
          <Tooltip title={triggerLabels.join(', ')}>
            <span>{triggers.length} 个触发器</span>
          </Tooltip>
        )
      }
    },
    {
      title: '行动',
      dataIndex: 'actions',
      key: 'actions',
      width: 150,
      render: (actions: AutoScoreRule['actions']) => {
        if (!actions || actions.length === 0) {
          return <span>无</span>
        }
        const actionLabels = actions.map((a) => {
          const def = actionRegistry.get(a.event)
          return def?.label || a.event
        })
        return (
          <Tooltip title={actionLabels.join(', ')}>
            <span>{actions.length} 个行动</span>
          </Tooltip>
        )
      }
    },
    {
      title: '适用学生',
      dataIndex: 'studentNames',
      key: 'studentNames',
      width: 130,
      render: (studentNames: string[]) => {
        if (!studentNames || studentNames.length === 0) {
          return <span>所有学生</span>
        }
        const studentList = studentNames.join(',\n')
        return (
          <Tooltip title={studentList}>
            <span>{studentNames.length} 名学生</span>
          </Tooltip>
        )
      }
    },
    {
      title: '最后执行',
      dataIndex: 'lastExecuted',
      key: 'lastExecuted',
      width: 180,
      render: (lastExecuted: string) => {
        if (!lastExecuted) return <span>未执行</span>
        try {
          const date = new Date(lastExecuted)
          return date.toLocaleString()
        } catch {
          return <span>无效时间</span>
        }
      }
    },
    {
      title: '操作',
      key: 'operation',
      width: 150,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(row)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除这条自动化吗？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const triggerItems = triggerList
    .filter((t) => t.eventName !== null)
    .map((item, idx) => (
      <TriggerItemComponent
        key={item.id}
        item={item}
        onDelete={handleDeleteTrigger}
        onChange={handleTriggerChange}
        onValueChange={handleTriggerValueChange}
        onRelationChange={handleTriggerRelationChange}
        isFirst={idx === 0}
      />
    ))

  const actionItems = actionList
    .filter((a) => a.eventName !== null)
    .map((item) => (
      <ActionItemComponent
        key={item.id}
        item={item}
        onDelete={handleDeleteAction}
        onChange={handleActionChange}
        onValueChange={handleActionValueChange}
        onReasonChange={handleActionReasonChange}
      />
    ))

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      <h2 style={{ marginBottom: '24px', color: 'var(--ss-text-main)' }}>自动化加分管理</h2>

      <Card style={{ marginBottom: '24px', backgroundColor: 'var(--ss-card-bg)' }}>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <Form.Item
              label="自动化名称"
              name="name"
              rules={[{ required: true, message: '请输入自动化名称' }]}
            >
              <Input placeholder="例如：每日签到加分" />
            </Form.Item>

            <Form.Item label="适用学生" name="studentNames">
              <Select
                mode="multiple"
                showSearch
                placeholder="请选择或搜索学生（留空表示所有学生）"
                options={students.map((student) => ({ label: student.name, value: student.name }))}
              />
            </Form.Item>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <Button type="primary" onClick={handleSubmit}>
              {editingRuleId !== null ? '更新自动化' : '添加自动化'}
            </Button>
            <Button onClick={handleResetForm}>
              {editingRuleId !== null ? '取消编辑' : '重置表单'}
            </Button>
          </div>
        </Form>
      </Card>

      <Card
        style={{ marginBottom: '24px', backgroundColor: 'var(--ss-card-bg)' }}
        title="当以下规则触发时"
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          {triggerItems}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddTrigger}
            style={{ fontWeight: 'bolder', fontSize: 15 }}
          >
            添加规则
          </Button>
        </Space>
      </Card>

      <Card
        style={{ marginBottom: '24px', backgroundColor: 'var(--ss-card-bg)' }}
        title="满足规则时触发的行动"
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          {actionItems}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddAction}
            style={{ fontWeight: 'bolder', fontSize: 15 }}
          >
            添加行动
          </Button>
        </Space>
      </Card>

      <Card style={{ marginBottom: '24px', backgroundColor: 'var(--ss-card-bg)' }}>
        <Table
          dataSource={rules.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          style={{ color: 'var(--ss-text-main)' }}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={rules.length}
            onChange={(page, size) => {
              setCurrentPage(page)
              setPageSize(size)
            }}
            showSizeChanger
            showTotal={(total) => `共 ${total} 条`}
          />
        </div>
      </Card>
    </div>
  )
}
