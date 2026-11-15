# Spec Delta

## Purpose

Allow visitors to send protected contact messages and receive accessible verification and submission feedback without leaving the website.

## ADDED Requirements

### Requirement: On-page contact submission

The site SHALL submit a valid email address, optional subject, message, and honeypot value to the configured Formspree form without navigating away. It SHALL show success only after the service confirms acceptance and clear the form only on confirmed success.

#### Scenario: Accepted message
- **WHEN** a visitor submits valid fields with completed verification and Formspree confirms acceptance
- **THEN** the contact page remains at its current URL and announces success
- **AND** the submitted fields are cleared without reloading the page

#### Scenario: Invalid fields
- **WHEN** a visitor attempts submission with a missing message or invalid email
- **THEN** field validation identifies the problem and no submission request is sent

### Requirement: Server-enforced verification

Each submission SHALL include a current Cloudflare Turnstile token under `cf-turnstile-response`. Formspree SHALL be configured to validate that token before accepting the message. Browser verification alone SHALL NOT be treated as message acceptance or substitute for server-side enforcement.

#### Scenario: Verification required
- **WHEN** a visitor submits valid fields without a current token
- **THEN** verification is requested on-page before any message is sent
- **AND** a required interactive challenge remains keyboard-accessible

#### Scenario: Invalid token rejected by service
- **WHEN** Formspree rejects a missing, invalid, expired, or previously used token
- **THEN** the site does not report success and retains the entered fields
- **AND** another submission requires fresh verification

#### Scenario: Token expires before submission
- **WHEN** the verification provider reports that the token has expired
- **THEN** the expired token is discarded and cannot be submitted
- **AND** verification can be completed again without re-entering the message

### Requirement: Recoverable and unambiguous submission states

The form SHALL announce verification, sending, success, and failure states. It SHALL prevent concurrent duplicate submissions, retain input on failure, and offer explicit retry when possible. An uncertain delivery outcome SHALL NOT trigger automatic resubmission or claim definite non-delivery.

#### Scenario: Repeated activation while pending
- **WHEN** a visitor repeatedly activates Send while verification or submission is pending
- **THEN** at most one message submission proceeds for that attempt

#### Scenario: Service error
- **WHEN** the service returns a validation error, HTTP 403, rate limit, or server error
- **THEN** useful on-page feedback is shown without injecting response HTML
- **AND** the form retains input and supports explicit retry with fresh verification

#### Scenario: Connection loss or unrecognized response
- **WHEN** delivery cannot be confirmed because the request times out, disconnects, or returns an unrecognized response
- **THEN** feedback explains that delivery is uncertain and no automatic resubmission occurs
- **AND** the visitor retains control of any retry

### Requirement: Fail-closed unavailable states

When required configuration, JavaScript, or verification is unavailable, the site SHALL explain the limitation without external navigation or unverified submission. Provider loading and verification timeouts SHALL lead to recoverable feedback rather than indefinite pending controls.

#### Scenario: Missing configuration
- **WHEN** the form identifier or public site key is missing or unusable
- **THEN** the page shows an unavailable state without an active submission path

#### Scenario: JavaScript disabled
- **WHEN** a visitor loads contact with JavaScript disabled
- **THEN** a visible explanation states that protected submission requires JavaScript
- **AND** neither button activation nor Enter submits or redirects the form

#### Scenario: Provider blocked or timed out
- **WHEN** the verification script cannot load or verification times out
- **THEN** the page retains input and explains how to retry
- **AND** no message is submitted without verification

### Requirement: Accessible themed presentation

Site-owned controls and feedback SHALL follow the existing design system, expose visible labels and keyboard focus, and announce state changes accessibly. Verification SHALL remain usable in both explicit site themes and narrow layouts without horizontal overflow or obstruction by fixed navigation/footer elements.

#### Scenario: Theme differs from operating system
- **WHEN** the visitor selects a site theme different from the operating-system preference
- **THEN** the visible verification widget follows the selected site theme
- **AND** any widget replacement preserves entered fields and does not send a message

#### Scenario: Narrow screen or reduced motion
- **WHEN** contact is viewed at a 320px viewport width or with reduced motion enabled
- **THEN** controls, verification, and feedback remain readable and reachable without horizontal page overflow
- **AND** no required interaction depends on animation

### Requirement: Navigation-safe verification lifecycle

The form SHALL work on direct entry, internal navigation, and back/forward navigation at root and project-subpath deployments. Leaving contact SHALL dispose of its verification resources; late asynchronous results SHALL NOT modify a subsequently mounted form or trigger additional submissions.

#### Scenario: Repeated visits
- **WHEN** a visitor repeatedly enters and leaves contact through internal navigation or browser history
- **THEN** each current form has only one active verification widget and submission handler

#### Scenario: Navigation during pending work
- **WHEN** the visitor leaves contact before script loading, verification, or submission completes
- **THEN** stale callbacks do not alter another page or a newly opened contact form
- **AND** navigation does not automatically retry the message

### Requirement: Scoped provider loading

Contact content SHALL render without waiting for verification resources or fonts. Fresh visits to unrelated pages SHALL NOT fetch Turnstile resources. A contact visit SHALL defer provider loading until form interaction and SHALL keep initial rendering within the existing performance budgets.

#### Scenario: Cold visit without interaction
- **WHEN** a visitor opens home or opens contact without interacting with the form
- **THEN** readable content appears without requesting Turnstile resources

#### Scenario: Slow verification load
- **WHEN** a visitor interacts with contact while verification resources load slowly
- **THEN** fields remain usable and verification progress is communicated
- **AND** verification resources are not loaded more than once concurrently

### Requirement: Public configuration and private credentials

Builds SHALL expose only the public form identifier and Turnstile site key. The Turnstile secret SHALL remain with Formspree for server-side validation and SHALL NOT appear in frontend assets, repository files, browser requests, or logs. Automated tests SHALL NOT send real messages.

#### Scenario: Production configuration
- **WHEN** the site is built for deployment
- **THEN** its contact configuration uses the supplied public identifiers without requiring the Turnstile secret in the build environment

#### Scenario: Isolated tests
- **WHEN** local automated contact tests run
- **THEN** provider verification and message submission are intercepted with synthetic fixtures
- **AND** no production credentials or real delivery are required
