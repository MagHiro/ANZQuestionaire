'use client'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from '@/components/Icons'

export function StyledSelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Choose an answer…',
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label: string
  placeholder?: string
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger aria-label={label} className="styled-select">
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown size={18} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" className="select-menu" sideOffset={6}>
          <Select.Viewport>
            {options
              .filter((o) => o.value)
              .map((o) => (
                <Select.Item key={o.value} value={o.value} className="select-item">
                  <Select.ItemText>{o.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
