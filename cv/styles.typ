#import "@preview/fontawesome:0.6.2": fa-icon

#let font-sans = "Space Grotesk"
#let font-mono = "Inconsolata"
#let color-background = rgb("#eee6da")
#let color-text = rgb("#1a1818")
#let color-muted = rgb("#655c56")
#let color-border = rgb("#c4b8aa")
#let color-accent = rgb("#b91d15")
#let metadata(body) = text(font: font-mono, fill: color-muted)[#body]

#let section(title) = block(above: 5pt, below: 4pt)[
  #move(dx: -14pt)[
    #block(width: 100% + 14pt)[
      #text(font: font-mono, weight: "medium", size: 10.5pt, tracking: 0.04em)[#upper(title)]
      #v(-2pt)
      #move(dy: -8pt, line(length: 100%, stroke: (paint: color-border, thickness: 0.5pt)))
    ]
  ]
]

#let entry(primary, location, secondary, dates, body: none, gap: 14pt) = block(below: gap)[
  #grid(
    columns: (1fr, 116pt),
    column-gutter: 10pt,
    row-gutter: 4pt,
    align: (left + horizon, left + horizon),
    [#strong(primary)], [#metadata(location)],
    [#secondary], [#metadata(dates)],
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
