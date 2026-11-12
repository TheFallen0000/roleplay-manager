import type { ReactNode } from "react"

interface SectionPanelProps {
  id: string
  kicker: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function SectionPanel({
  id,
  kicker,
  title,
  description,
  actions,
  children,
}: SectionPanelProps) {
  const headingId = `${id}-heading`

  return (
    <section id={id} className="rm-panel scroll-mt-24" aria-labelledby={headingId}>
      <div className="rm-panel-head">
        <div>
          <span className="rm-kicker">{kicker}</span>
          <h2 id={headingId}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="rm-panel-body">{children}</div>
    </section>
  )
}
