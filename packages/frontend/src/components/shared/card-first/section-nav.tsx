import { useEffect, useState } from "react"

export interface CardFirstSection {
  id: string
  label: string
  number: string
}

interface SectionNavProps {
  ariaLabel: string
  caption: string
  sections: CardFirstSection[]
}

export function SectionNav({ ariaLabel, caption, sections }: SectionNavProps) {
  const [active, setActive] = useState(sections[0]?.id ?? "")

  useEffect(() => {
    if (sections.length === 0 || typeof IntersectionObserver === "undefined") {
      return
    }

    const observed = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null)
    if (observed.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          )
        if (visible[0]?.target.id) setActive(visible[0].target.id)
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 1] },
    )

    observed.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav className="rm-section-nav" aria-label={ariaLabel}>
      <span className="rm-nav-caption">{caption}</span>
      {sections.map((section) => (
        <a
          key={section.id}
          className="rm-nav-link"
          href={`#${section.id}`}
          aria-current={active === section.id ? "location" : undefined}
          onClick={() => setActive(section.id)}
        >
          <span className="rm-nav-num">{section.number}</span>
          {section.label}
        </a>
      ))}
    </nav>
  )
}
