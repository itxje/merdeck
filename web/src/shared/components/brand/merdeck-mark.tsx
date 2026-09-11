import * as React from 'react'

// Merdeck = Mermaid + deck. Three flowchart nodes and their edges form an "M"
// standing on a deck bar. Stroke-only and drawn in `currentColor` so the
// theme tokens drive it in both light and dark surfaces. The geometry is
// duplicated verbatim in web/public/favicon.svg and in the design prototype;
// change all of them together.
function MerdeckMark({ strokeWidth = 1.7, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4.6 8.6V17.6M19.4 8.6V17.6M5.62 8.24 10.98 14.76M18.38 8.24 13.02 14.76" />
      <path d="M2.6 17.6H21.4" />
      <circle cx="4.6" cy="7" r="1.6" />
      <circle cx="12" cy="16" r="1.6" />
      <circle cx="19.4" cy="7" r="1.6" />
    </svg>
  )
}

export { MerdeckMark }
