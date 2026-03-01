import { Input } from 'antd'
import type { ActionComponentProps } from '../types'

export const eventName = 'add_score'
export const label = '添加分数'
export const description = '为学生添加分数'
export const hasReason = true

const AddScoreAction: React.FC<ActionComponentProps> = ({
  value,
  reason,
  onChange,
  onReasonChange
}) => {
  return (
    <>
      <Input
        placeholder="请输入分数"
        style={{ width: '150px' }}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? String(e.target.value) : '')}
      />
      <Input
        placeholder="请输入理由"
        style={{ width: '150px' }}
        value={reason ?? ''}
        onChange={(e) => onReasonChange?.(e.target.value ? String(e.target.value) : '')}
      />
    </>
  )
}

export default AddScoreAction
