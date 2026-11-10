#import "@preview/fontawesome:0.6.2": fa-icon

#let section(title) = block(above: 5pt, below: 4pt)[
  #move(dx: -14pt)[
    #block(width: 100% + 14pt)[
      #text(size: 10.5pt, smallcaps(title))
      #v(-2pt)
      #move(dy: -8pt, line(length: 100%, stroke: 0.5pt))
    ]
  ]
]

#let entry(primary, location, secondary, dates, body: none, gap: 14pt) = block(below: gap)[
  #grid(
    columns: (1fr, 92pt),
    column-gutter: 10pt,
    row-gutter: 4pt,
    align: (left + horizon, left + horizon),
    [#strong(primary)], [#location],
    [#secondary], [#dates],
  )
  #if body != none {
    v(4pt)
    body
  }
]

#let achievements(items) = list(
  tight: true,
  marker: [•],
  indent: 15pt,
  body-indent: 7pt,
  spacing: 10pt,
  ..items,
)

#let cv-icon(name, size: 8pt) = fa-icon(
  name,
  size: size,
  solid: name != "github",
  top-edge: "baseline",
)
