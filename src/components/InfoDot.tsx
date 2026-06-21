import { useState } from 'react'
import Icon from './Icon'

/** small circled "i"; reveals a tooltip on hover, focus, or tap (works on touch
 *  where there is no hover). Tooltip text is plain, already-localized copy.
 *  `align` anchors the tooltip horizontally — use "end" near the right edge
 *  (or "start" near the left) so a wide tooltip stays on-screen. */
export default function InfoDot({
  text,
  align = 'center',
}: {
  text: string
  align?: 'center' | 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className="infodot">
      <button
        type="button"
        className="infodot-btn"
        aria-label={text}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        <Icon name="info" size={14} />
      </button>
      <span className={`infodot-tip infodot-tip--${align}${open ? ' open' : ''}`} role="tooltip">
        {text}
      </span>
    </span>
  )
}
