# Spec Delta

## Purpose

Identify the source revision represented by a rendered website build without additional browser requests, while clearly distinguishing local builds without deployment metadata.

## ADDED Requirements

### Requirement: Build-specific commit identity

The site SHALL display the first seven characters of the full source commit SHA supplied for its build. The label SHALL identify that build, not a subsequently updated branch or the latest deployment.

#### Scenario: Deployment built from a known revision
- **WHEN** the site is built with valid source commit and repository metadata
- **THEN** every page using the shared layout contains the same seven-character commit label
- **AND** the label represents the source revision used to build the deployed artifact

#### Scenario: Branch advances after a build
- **WHEN** a visitor loads an earlier build after its source branch has advanced
- **THEN** the label still identifies the earlier build's commit

### Requirement: Sidebar-bottom placement

The label SHALL appear directly below the theme toggle in the sidebar's non-scrolling bottom area. It SHALL remain readable in both themes and at mobile and desktop widths without overlapping the toggle, navigation, or copyright footer. Bottom safe-area spacing SHALL remain intact.

#### Scenario: Narrow or short viewport
- **WHEN** a page is viewed at a narrow mobile width or in a short landscape viewport
- **THEN** the label remains below the theme toggle and within the viewport without horizontal overflow
- **AND** navigation remains reachable through its existing scroll area

#### Scenario: Theme change and internal navigation
- **WHEN** a visitor switches themes and navigates between site pages
- **THEN** the label stays readable in the same sidebar-bottom position
- **AND** theme controls continue working and the copyright footer stays unchanged

### Requirement: Accessible exact-commit link

A valid commit label SHALL be a keyboard-accessible link to the supplied repository's full commit SHA on GitHub. Its accessible name SHALL identify it as the build commit and include the full SHA. The link SHALL have visible focus and follow existing site link styling.

#### Scenario: Link destination and keyboard access
- **WHEN** a visitor focuses a valid commit label with the keyboard
- **THEN** focus is visible and its accessible name identifies the build commit
- **AND** its destination is `https://github.com/<owner>/<repository>/commit/<full-sha>` rather than a branch or abbreviated-SHA URL

#### Scenario: Project Pages base path
- **WHEN** the site is built beneath a non-root base path
- **THEN** the commit link still targets the absolute GitHub commit URL without the site's base path

### Requirement: Safe local fallback

When commit or repository metadata is missing or malformed, the site SHALL render non-linked `local` text in the label position. It SHALL NOT infer a deployed version from local Git state or construct a link using invalid metadata.

#### Scenario: Ordinary local build
- **WHEN** a development server or local production build has no deployment metadata
- **THEN** the label displays `local` without a commit link
- **AND** the build succeeds without requiring Git metadata

#### Scenario: Incomplete or invalid metadata
- **WHEN** the supplied commit is not a full hexadecimal SHA or the repository is not a valid owner/repository identifier
- **THEN** the label displays `local` without a link
- **AND** invalid metadata is not rendered as link text or a destination

### Requirement: Static rendering without additional requests

The label SHALL be present in generated HTML without additional client-side JavaScript, remote badges, or version-fetching requests. Its presence SHALL NOT depend on font completion, JavaScript execution, or GitHub availability.

#### Scenario: JavaScript disabled and external requests blocked
- **WHEN** a visitor loads a generated page with JavaScript disabled and external requests blocked
- **THEN** the commit label or local fallback is already readable
- **AND** displaying it makes no request to GitHub or another external service
