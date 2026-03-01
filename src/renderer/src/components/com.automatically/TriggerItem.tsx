import { Button, Select } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { triggerRegistry, allTriggers } from './registry'
import type { TriggerItem as TriggerItemType } from './types'

interface TriggerItemProps {
  item: TriggerItemType
  onDelete: (id: number) => void
  onChange: (id: number, eventName: string) => void
  onValueChange: (id: number, value: string) => void
  onRelationChange?: (id: number, relation: 'AND' | 'OR') => void
  isFirst?: boolean
}

const TriggerItem: React.FC<TriggerItemProps> = ({
  item,
  onDelete,
  onChange,
  onValueChange,
  onRelationChange,
  isFirst = false
}) => {
  const definition = triggerRegistry.get(item.eventName)
  const Component = definition?.component
  const relation = item.relation || 'AND'

  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {!isFirst && (
        <Button
          type={relation === 'AND' ? 'primary' : 'default'}
          danger={relation === 'OR'}
          onClick={() => onRelationChange?.(item.id, relation === 'AND' ? 'OR' : 'AND')}
        >
          {relation === 'AND' ? '并' : '或'}
        </Button>
      )}
      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(item.id)} />
      <Select
        value={item.eventName}
        style={{ width: '200px' }}
        options={allTriggers.options}
        placeholder="请选择触发规则"
        onChange={(value) => onChange(item.id, value as string)}
      />
      {Component && (
        <Component value={item.value} onChange={(value) => onValueChange(item.id, value)} />
      )}
    </div>
  )
}

export default TriggerItem
