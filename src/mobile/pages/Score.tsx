import { useState, useEffect } from 'react'
import { Card, Button, Selector, Input, TextArea, SpinLoading, Toast } from 'antd-mobile'
import { useApi } from '../App'

interface Student {
  id: number
  name: string
  score: number
}

interface Reason {
  id: number
  content: string
  delta: number
  category: string
}

export function MobileScore(): React.JSX.Element {
  const { api, config } = useApi()
  const [students, setStudents] = useState<Student[]>([])
  const [reasons, setReasons] = useState<Reason[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedReason, setSelectedReason] = useState<Reason | null>(null)
  const [customScore, setCustomScore] = useState('')
  const [customReason, setCustomReason] = useState('')

  useEffect(() => {
    if (!config.baseUrl) return
    loadData()
  }, [config.baseUrl])

  const loadData = async () => {
    setLoading(true)
    try {
      const [stuRes, reaRes] = await Promise.all([
        api.get('/api/students'),
        api.get('/api/reasons')
      ])
      if (stuRes.success) setStudents(stuRes.data || [])
      if (reaRes.success) setReasons(reaRes.data || [])
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      Toast.show({ content: '请选择学生', icon: 'fail' })
      return
    }

    const delta = selectedReason?.delta ?? parseInt(customScore, 10)
    if (isNaN(delta)) {
      Toast.show({ content: '请选择理由或输入分值', icon: 'fail' })
      return
    }

    const reasonContent = selectedReason?.content || customReason || '积分变更'

    setSubmitting(true)
    try {
      let successCount = 0
      for (const studentName of selectedStudents) {
        const res = await api.post('/api/events', {
          student_name: studentName,
          reason_content: reasonContent,
          delta
        })
        if (res.success) successCount++
      }

      Toast.show({
        content: `已为 ${successCount} 名学生提交积分`,
        icon: 'success'
      })

      setSelectedStudents([])
      setSelectedReason(null)
      setCustomScore('')
      setCustomReason('')
    } catch (e) {
      Toast.show({ content: '提交失败', icon: 'fail' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!config.baseUrl) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p>请先在设置中配置服务器地址</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>积分操作</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <SpinLoading />
        </div>
      ) : (
        <>
          <Card title="选择学生" style={{ marginBottom: '12px' }}>
            <Selector
              columns={3}
              multiple
              value={selectedStudents}
              onChange={(v) => setSelectedStudents(v as string[])}
              options={students.map((s) => ({
                label: s.name,
                value: s.name
              }))}
            />
          </Card>

          <Card title="快捷理由" style={{ marginBottom: '12px' }}>
            <Selector
              columns={2}
              value={selectedReason ? [selectedReason.id] : []}
              onChange={(v) => {
                const reason = reasons.find((r) => r.id === v[0])
                setSelectedReason(reason || null)
                if (reason) {
                  setCustomScore(String(Math.abs(reason.delta)))
                }
              }}
              options={reasons.map((r) => ({
                label: `${r.content} (${r.delta > 0 ? `+${r.delta}` : r.delta})`,
                value: r.id
              }))}
            />
          </Card>

          <Card title="自定义" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input
                placeholder="分值（如：2 或 -2）"
                value={customScore}
                onChange={setCustomScore}
                type="number"
              />
              <TextArea
                placeholder="理由（可选）"
                value={customReason}
                onChange={setCustomReason}
                rows={2}
              />
            </div>
          </Card>

          <Button block color="primary" size="large" loading={submitting} onClick={handleSubmit}>
            提交
          </Button>
        </>
      )}
    </div>
  )
}
