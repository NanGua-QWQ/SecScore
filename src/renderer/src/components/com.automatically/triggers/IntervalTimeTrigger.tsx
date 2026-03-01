import { useState } from 'react'
import { InputNumber, Space, Radio } from 'antd'
import type { TriggerComponentProps } from '../types'

export const eventName = 'interval_time_passed'
export const label = '根据间隔时间触发'
export const description = '当间隔时间到达时触发自动化'
export const triggerLogic = {
  eventName,
  label,
  description,
  validate: (value: string) => {
    const minutes = parseInt(value, 10)
    if (isNaN(minutes) || minutes <= 0) {
      return { valid: false, message: '请输入有效的时间间隔（分钟）' }
    }
    return { valid: true }
  }
}

const IntervalTimeTrigger: React.FC<TriggerComponentProps> = ({ value, onChange }) => {
  const numValue = value ? parseInt(value, 10) : undefined
  const [unit, setUnit] = useState<'minutes' | 'days'>('minutes')

  const handleChange = (v: number | null) => {
    const numV = v
    if (numV === undefined || numV === null || isNaN(numV)) {
      onChange('')
      return
    }
    const minutes = unit === 'minutes' ? numV : numV * 1440
    onChange(String(Math.round(minutes)))
  }

  const displayValue =
    numValue === undefined || isNaN(numValue)
      ? undefined
      : unit === 'minutes'
        ? numValue
        : Math.max(1, Math.round(numValue / 1440))

  return (
    <Space>
      <InputNumber
        placeholder={unit === 'minutes' ? '请输入时间间隔（分钟）' : '请输入时间间隔（天）'}
        style={{ width: '100px' }}
        value={displayValue}
        onChange={handleChange}
        min={1}
      />
      <Radio.Group
        value={unit}
        onChange={(e) => setUnit(e.target.value as 'minutes' | 'days')}
        optionType="button"
        buttonStyle="solid"
      >
        <Radio.Button value="days">天</Radio.Button>
        <Radio.Button value="minutes">分钟</Radio.Button>
      </Radio.Group>
    </Space>
  )
}

export default IntervalTimeTrigger
