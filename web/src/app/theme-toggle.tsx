import type { LucideIcon } from 'lucide-react'
import type { Theme } from './theme'
import { Monitor, Moon, Sun } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useTheme } from './theme'

const options: { value: Theme, label: string, icon: LucideIcon }[] = [
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'dark', label: 'Dark theme', icon: Moon },
  { value: 'system', label: 'System theme', icon: Monitor },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <ToggleGroup
      className="theme-switch"
      aria-label="Theme"
      value={[theme]}
      onValueChange={(value) => {
        // Pressing the current preference again reports no value; keep exactly one preference.
        const next = options.find(option => option.value === value[0])
        if (next)
          setTheme(next.value)
      }}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <Tooltip key={value}>
          <TooltipTrigger render={<ToggleGroupItem value={value} aria-label={label} />}>
            <Icon />
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  )
}
