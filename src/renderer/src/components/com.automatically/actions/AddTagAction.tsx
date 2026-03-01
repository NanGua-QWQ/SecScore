import { Input } from 'antd'
import type { ActionComponentProps } from '../types'

export const eventName = 'add_tag'
export const label = '添加标签'
export const description = '为学生添加标签'
export const hasReason = false

const AddTagAction: React.FC<ActionComponentProps> = ({ value, onChange }) => {
  return (
    <Input
      placeholder="请输入标签"
      style={{ width: '150px' }}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? String(e.target.value) : '')}
    />
  )
}

export default AddTagAction
