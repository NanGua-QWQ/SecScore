import { useState, useEffect } from 'react'
import { Card, SpinLoading, Selector } from 'antd-mobile'
import { useApi } from '../App'

interface RankRow {
  name: string
  score: number
  range_change: number
}

export function MobileLeaderboard(): React.JSX.Element {
  const { api, config } = useApi()
  const [data, setData] = useState<RankRow[]>([])
  const [loading, setLoading] = useState(false)
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    if (!config.baseUrl) return
    loadData()
  }, [config.baseUrl, range])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/leaderboard?range=${range}`)
      if (res.success) {
        setData(res.data?.rows || [])
      }
    } catch (e) {
      console.error('Failed to load leaderboard:', e)
    } finally {
      setLoading(false)
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
      <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>排行榜</h2>

      <Selector
        columns={3}
        value={[range]}
        onChange={(v) => setRange(v[0] as 'today' | 'week' | 'month')}
        options={[
          { label: '今天', value: 'today' },
          { label: '本周', value: 'week' },
          { label: '本月', value: 'month' }
        ]}
        style={{ marginBottom: '12px' }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <SpinLoading />
        </div>
      ) : (
        <Card>
          {data.map((row, index) => (
            <div
              key={row.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: index < data.length - 1 ? '1px solid var(--adm-color-border)' : 'none'
              }}
            >
              <div
                style={{
                  width: '32px',
                  fontWeight: 'bold',
                  color: index < 3 ? '#1890ff' : 'inherit'
                }}
              >
                {index + 1}
              </div>
              <div style={{ flex: 1, fontWeight: 500 }}>{row.name}</div>
              <div style={{ fontWeight: 'bold', marginRight: '12px' }}>{row.score}</div>
              <div
                style={{
                  color:
                    row.range_change > 0 ? '#52c41a' : row.range_change < 0 ? '#ff4d4f' : '#999'
                }}
              >
                {row.range_change > 0 ? `+${row.range_change}` : row.range_change}
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>暂无数据</div>
          )}
        </Card>
      )}
    </div>
  )
}
