#import "styles.typ": font-sans, color-background, color-text, color-accent, metadata, section, entry, achievements, cv-icon

#let cv = yaml("data.yaml")
#let profile = cv.profile

#set page(
  paper: "a4",
  margin: (left: 0.8in, right: 0.8in, top: 43.5pt, bottom: 28pt),
  fill: color-background,
)
#set text(font: font-sans, size: 10pt, fill: color-text)
#set par(leading: 0.48em)
#show link: set text(fill: color-accent)

#align(center)[
  #stack(
    dir: ttb,
    spacing: 4pt,
    move(dy: -15pt, text(size: 24.5pt, smallcaps(profile.name))),
    move(dy: -8pt, metadata([#cv-icon("location-dot") #profile.location · #cv-icon("envelope") #link(profile.contact.url)[#profile.contact.label] · #cv-icon("github") #link(profile.github.url)[#profile.github.label]])),
  )
]

#section("About Me")
#cv.about

#section("Education")
#for item in cv.education {
  entry(item.institution, item.location, item.qualification, item.dates)
}

#section("Work Experience")
#for item in cv.experience {
  entry(
    item.role,
    item.location,
    item.company,
    item.dates,
    body: achievements(item.achievements),
    gap: 14pt,
  )
}

#v(9pt)

#section("Skills")
#pad(left: 6pt)[
  #grid(
    columns: (140pt, 1fr),
    row-gutter: 5.5pt,
    ..cv.skills.map(skill => ([#metadata([#strong(skill.label)])], [#skill.value])).flatten(),
  )
]

#section("Projects")
#for project in cv.projects {
  block(below: 8pt)[
    #cv-icon("github") #link(project.url)[#strong(project.name)] #metadata([#emph(project.technologies)])\
    #project.description
  ]
}
