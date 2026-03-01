import React, { useState, useEffect, useCallback } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, message, Tag, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface reason {
  id: number
  content: string
  category: string
  delta: number
  is_system: number
}

export const ReasonManager: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [data, setData] = useState<reason[]>([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const emitDataUpdated = (category: 'reasons' | 'all') => {
    window.dispatchEvent(new CustomEvent('ss:data-updated', { detail: { category } }))
  }

  const fetchReasons = useCallback(async () => {
    if (!(window as any).api) return
    setLoading(true)
    try {
      const res = await (window as any).api.queryReasons()
      if (res.success && res.data) {
        setData(res.data)
      }
    } catch (e) {
      console.error('Failed to fetch reasons:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReasons()
    const onDataUpdated = (e: any) => {
      const category = e?.detail?.category
      if (category === 'reasons' || category === 'all') fetchReasons()
    }
    window.addEventListener('ss:data-updated', onDataUpdated as any)
    return () => window.removeEventListener('ss:data-updated', onDataUpdated as any)
  }, [fetchReasons])

  const handleAdd = async () => {
    if (!(window as any).api) return
    if (!canEdit) {
      messageApi.error('当前为只读权限')
      return
    }
    const values = await form.validateFields()
    const content = values.content?.trim()
    const category = values.category?.trim() || '其他'

    if (data.some((r) => r.content === content && r.category === category)) {
      messageApi.warning('该分类下已存在相同理由')
      return
    }

    const res = await (window as any).api.createReason({
      ...values,
      content,
      category,
      delta: Number(values.delta)
    })
    if (res.success) {
      messageApi.success('添加成功')
      setVisible(false)
      form.resetFields()
      fetchReasons()
      emitDataUpdated('reasons')
    } else {
      messageApi.error(res.message || '添加失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!(window as any).api) return
    if (!canEdit) {
      messageApi.error('当前为只读权限')
      return
    }
    const res = await (window as any).api.deleteReason(id)
    if (res.success) {
      messageApi.success('删除成功')
      fetchReasons()
      emitDataUpdated('reasons')
    } else {
      messageApi.error(res.message || '删除失败')
    }
  }

  const columns: ColumnsType<reason> = [
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => <Tag>{category}</Tag>
    },
    { title: '理由内容', dataIndex: 'content', key: 'content', width: 250 },
    {
      title: '预设分值',
      dataIndex: 'delta',
      key: 'delta',
      width: 100,
      render: (delta: number) => (
        <span
          style={{
            color:
              delta > 0 ? 'var(--ant-color-success, #52c41a)' : 'var(--ant-color-error, #ff4d4f)'
          }}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )
    },
    {
      title: '操作',
      key: 'operation',
      width: 150,
      render: (_, row) => (
        <Popconfirm
          title="确认删除该理由？"
          onConfirm={() => handleDelete(row.id)}
          disabled={!canEdit}
        >
          <Button type="link" danger disabled={!canEdit}>
            删除
          </Button>
        </Popconfirm>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: 'var(--ss-text-main)' }}>理由管理</h2>
        <Button type="primary" disabled={!canEdit} onClick={() => setVisible(true)}>
          添加预设理由
        </Button>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        bordered
        pagination={{ pageSize: 50, total: data.length, defaultCurrent: 1 }}
        style={{ backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}
      />

      <Modal
        title="添加理由"
        open={visible}
        onOk={handleAdd}
        onCancel={() => setVisible(false)}
        okText="添加"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
          <Form.Item label="分类" name="category" initialValue="其他">
            <Input placeholder="例如: 学习, 纪律" />
          </Form.Item>
          <Form.Item
            label="理由内容"
            name="content"
            rules={[{ required: true, message: '请输入理由内容' }]}
          >
            <Input placeholder="请输入理由" />
          </Form.Item>
          <Form.Item
            label="预设分值"
            name="delta"
            rules={[{ required: true, message: '请输入预设分值' }]}
          >
            <InputNumber placeholder="例如: 2 或 -2" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
