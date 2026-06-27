import { dotColor, statusLabel, statusOf } from '@/lib/utils'
import type { DotStatus } from '@/lib/types'

interface Props {
  dias: number
  pulse?: boolean
  showLabel?: boolean
  showDays?: boolean
}

export default function StatusBadge({ dias, pulse = true, showLabel = true, showDays = true }: Props) {
  const st: DotStatus = statusOf(dias)
  const color   = dotColor(st)
  const label   = statusLabel(st)
  const critical = (st === 'danger' || st === 'venc') && pulse

  return (
    <span className="inline-flex items-center gap-1.5">
      {showDays && (
        <span className="font-mono text-[12.5px] font-semibold text-[#EAE0CF]">
          {dias < 0 ? 'vencido' : `${dias} d`}
        </span>
      )}
      {showLabel && (
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full"
          style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
          <span
            className={critical ? 'animate-lcpulse' : ''}
            style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }}
          />
          {label}
        </span>
      )}
    </span>
  )
}
