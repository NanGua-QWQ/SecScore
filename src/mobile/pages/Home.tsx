import { useState, useEffect } from 'react'
import { Card, Tag, SearchBar, Space, SpinLoading } from 'antd-mobile'
import { useApi } from '../App'

interface Student {
  id: number
  name: string
  score: number
}

export function MobileHome(): React.JSX.Element {
  const { api, config } = useApi()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!config.baseUrl) return
    loadStudents()
  }, [config.baseUrl])

  const loadStudents = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/students')
      if (res.success) {
        setStudents(res.data || [])
      }
    } catch (e) {
      console.error('Failed to load students:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const getAvatarColor = (name: string) => {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
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
      <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>学生积分</h2>

      <SearchBar
        placeholder="搜索学生"
        value={search}
        onChange={setSearch}
        style={{ marginBottom: '12px' }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <SpinLoading />
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {filteredStudents.map((student) => (
            <Card key={student.id} style={{ borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: getAvatarColor(student.name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {student.name.slice(-2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{student.name}</div>
                  <Tag
                    color={student.score > 0 ? 'success' : student.score < 0 ? 'danger' : 'default'}
                  >
                    {student.score > 0 ? `+${student.score}` : student.score}
                  </Tag>
                </div>
              </div>
            </Card>
          ))}
        </Space>
      )}

      {!loading && filteredStudents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          {search ? '未找到匹配的学生' : '暂无学生数据'}
        </div>
      )}
    </div>
  )
}
