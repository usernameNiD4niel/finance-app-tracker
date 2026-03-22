# Master Prompt
You are a senior React Native UI implementation agent.

Your task is to restyle the existing app so that its UI matches the attached reference image as closely as possible, while preserving the app’s current functionality, routes, available pages, content structure, and existing business logic.

## Primary Objective

Use the attached reference image as the single visual standard for the app’s UI direction.

This means the final UI should closely match the reference in:
- overall visual tone
- dark theme treatment
- panel/card shapes
- spacing rhythm
- typography scale and weight
- icon sizing and placement
- color palette
- gradients and glow effects
- button styling
- tab/navigation styling
- balance of density vs breathing room
- premium crypto-fintech aesthetic

Do not redesign it in your own style.
Do not “improve” it into something else.
Do not simplify away the visual richness.
Your job is to translate the reference design into the existing app.

## Non-Negotiable Rules
1. Preserve the current app’s functionality
   - Do not break business logic.
   - Do not remove existing screens unless absolutely necessary.
   - Do not rename routes, hooks, state, services, or API integrations unless required for refactor safety.
   - UI changes must stay isolated from business logic as much as possible.

2. Use the reference image as the visual source of truth
   - The visual direction must clearly feel like the screenshot.
   - If something is not explicitly visible in the screenshot, infer it from the same design language.
   
3. Use current app content and available pages
   - Replace the sample text/content in the reference with whatever pages, labels, sections, and data already exist in the current app.
   - Keep the app’s existing information architecture unless there is an obvious visual reason to reorganize sections within a screen.
   
4. Prioritize exactness over creativity
   - Match spacing, proportions, border radii, visual hierarchy, and contrast as closely as possible.
   - Avoid generic mobile UI defaults.
   - Avoid material-looking defaults unless they are visually adapted to match the reference.

5. Cross-platform compatibility is required
- The app is React Native.
- The implementation must work cleanly for both iOS and Android.
- Use platform-safe layout, shadows, border radii, and typography decisions.

---

## Visual Design Specification

### 1) Overall Aesthetic

Adopt a high-end dark crypto wallet / fintech dashboard visual style with:
  - near-black / charcoal backgrounds
  - soft elevated rounded cards
  - subtle gradients with blue-violet glow accents
  - minimal but premium interface chrome
  - clean typography with strong contrast
  - compact but breathable layout
  - clear hierarchy through size, spacing, and card grouping

The UI should feel:
  - sleek
  - premium
  - modern
  - focused
  - high-contrast
  - touch-friendly
  - polished, not noisy

---

### 2) Color System

Use a palette very close to the reference:

#### Base colors
- App background: very dark charcoal / graphite
- Main surface: deep black-gray
- Secondary surface: slightly lighter charcoal
- Card background: dark neutral with subtle depth difference from page background
- Divider/subtle strokes: low-contrast gray with minimal visibility

#### Accent colors
- Primary accent: electric indigo / blue-violet
- Secondary accent glow: bright blue with soft purple blend
- Success/positive: green similar to the screenshot
- Highlight action color for crypto price gains and confirmation indicators
- Bitcoin-like accent: warm orange
- Ethereum-like accent: off-white / soft silver
- Dollar/fiat accent: bright green

#### Guidance
- Do not use bright flat colors everywhere.
- Accent colors should be concentrated in:
    - hero gradient
    - primary CTA buttons
    - active states
    - gain indicators
    - selected controls
- Most of the UI should remain dark and restrained.

---

### 3) Typography

Use a clean modern sans-serif font that is very close to the screenshot.

Preferred approach:

- If the current app already uses a clean modern font, keep it if visually close.
- Otherwise, use a font with a geometric / contemporary feel similar to:
  - Inter
  - SF Pro-like feel
  - Manrope
  - or another close modern sans-serif

Typography behavior:

- Large balance/value numbers should be bold or semibold and visually dominant.
- Labels should be smaller, muted, and understated.
- Section headings should be medium weight.
- Tab labels and secondary metadata should be low emphasis.
- Buttons should use readable medium/semibold weight.

Avoid:

- serif fonts
- condensed fonts
- overly rounded playful fonts
- inconsistent font families across screens

---

### 4) Layout Principles

Match the screenshot’s layout logic:
- generous outer padding
- rounded cards with strong corner radius
- stacked modules/cards with tight but intentional spacing
- dense information inside cards, but uncluttered
- primary content near the top
- clear block segmentation
- navigation anchored cleanly at bottom
- action row directly below balance/hero area
- horizontal chip/tab selector styling where appropriate

Every screen in the app should follow the same layout DNA:
- dark page background
- prominent top section
- grouped content cards
- subtle separation through spacing, not heavy borders
- rounded interactive surfaces

---

### 5) Shape Language

Match the screenshot closely:
- Cards: large rounded corners
- Buttons: pill-shaped or large rounded rectangles
- Small controls: circular or capsule form
- Chips/tabs: rounded pill containers
- Floating action feel where needed
- Avoid sharp corners almost entirely

Suggested direction:
- Large cards: 22–28 radius
- Medium cards/buttons: 16–22 radius
- Pills/chips: fully rounded
- Icon buttons: circular containers

Use consistent radii throughout the app.

---

### 6) Depth, Glow, and Shadows

The reference relies on subtle depth, not loud shadow effects.

Use:
- soft elevation through contrast difference between surfaces
- slight shadows where needed
- gentle inner visual separation
- subtle blue/violet glow in the hero area and primary actions

Do not:
- use heavy Android-style default shadows
- use obvious skeuomorphic effects
- add random glows everywhere
- overdo blur unless already supported and stable

---

### 7) Hero / Top Summary Area

The reference has a strong top area with:
- profile/header row
- total balance emphasis
- blue-violet glowing gradient behind key content
- quick actions below balance

Translate this pattern into the existing home/dashboard/main summary screen.

The top section should include:
- current top-level summary relevant to the app
- prominent main value or key metric
- a soft glowing gradient background treatment
- quick actions represented as circular or pill controls
- a premium card container with strong rounding

Even if the exact content differs from the reference, the visual treatment should stay aligned.

---

### 8) Buttons and Interactive Elements

Buttons must follow the reference:

#### Primary CTA
- bright indigo / violet gradient or solid close equivalent
- large pill/rounded rectangle
- centered label
- strong contrast
- visually prominent

#### Secondary actions
- circular or rounded dark buttons
- icon-first or icon+label
- subtle surface contrast
- soft active/pressed state

#### Chips / segmented selectors
- dark rounded capsules
- active state slightly brighter or filled
- inactive state muted
- spacing compact but readable

Avoid platform default buttons.

---

### 9) Cards and Data Modules

All cards should feel like they belong to the same system.

Use patterns inspired by the reference:
- dark elevated tile
- rounded corners
- icon/avatar/token at left or top-left
- primary value large and readable
- secondary metadata muted
- gain/loss or status aligned cleanly
- consistent padding
- minimal decoration beyond color and subtle spacing

Cards should visually support:
- account summaries
- list items
- settings sections
- analytics summaries
- transaction history rows
- action forms
- exchange/transfer/send screens

---

### 10) Navigation

Bottom navigation should match the reference style:
- dark integrated bar
- subtle separation from body
- simple line or minimal icons
- small labels
- balanced spacing
- active item brighter and clearer
- inactive items muted

Do not use heavy filled tab bars unless adapted to match the screenshot’s understated style.

If the current app uses another navigation pattern, visually restyle it to fit this design system while preserving its behavior.

---

### 11) Forms / Input Screens

For any send, transfer, exchange, edit, settings, or input-driven screen, use the right-side reference style as guidance:
- stacked rounded input panels
- currency/account selector row
- large centered value entry
- muted balance/helper text
- swap/toggle/exchange control between panels if relevant
- strong primary action button
- summary details in compact rows below

Inputs should feel premium and embedded into cards, not like browser-style text fields.

---

## Screen Mapping Instructions

Apply the visual system to all existing screens in the app.

### Screen-by-screen expectation

For each existing screen:
1. Keep the current purpose and features. 
2. Rebuild the layout and components so they visually align with the reference. 
3. Reuse the same design tokens and component system across the entire app.

### Important

Where the screenshot shows crypto wallet content, but the current app has different content, keep the current app content and restyle it using the same visual language.

Examples:
- If the app has “Projects”, “Tasks”, or “Orders” instead of “Crypto”, do not force crypto wording.
- If the app has different tabs or sections, style them like the screenshot’s chip selector and bottom nav.
- If the current app has analytics, profile, settings, forms, lists, or dashboards, convert those screens into the same premium dark card-based system.

--- 

## Component System Requirements

Create or refactor into reusable UI primitives where appropriate.

Expected reusable design primitives:
- ScreenContainer
- TopHeader
- HeroSummaryCard
- RoundedCard
- StatCard
- ActionPillButton
- CircleIconButton
- SegmentedChipGroup
- PrimaryCTAButton
- BottomTabBar
- ListRowCard
- Token/Avatar/IconBadge
- ValueDisplay
- MutedLabel
- InputCard
- DetailRow

Also define a centralized theme with:
- colors
- spacing scale
- radius scale
- typography scale
- shadows/elevation
- gradients

Do not scatter magic values across files.

---

## Spacing System

Use a disciplined spacing scale and keep it consistent.

Visual intent:
- tight internal spacing inside compact cards
- generous outer margins around major sections
- enough breathing room between stacked modules
- no cramped text
- no random spacing differences

Use a spacing system like:
- xs
- sm
- md
- lg
- xl
- xxl

Then apply consistently across all screens.

---

## Implementation Constraints

Use React Native best practices.
- Keep components modular.
- Prefer reusable styling tokens over repeated inline styling.
- Avoid hacky one-off overrides.
- Support different screen sizes responsively.
- Ensure safe area handling.
- Maintain good touch target sizes.
- Keep rendering efficient.
- Do not introduce unnecessary dependencies unless clearly justified.
- Use gradients only where they support the reference design.
- Keep accessibility reasonable without compromising the visual target.

If already using:
- React Navigation → keep it
- Zustand / Redux / Context → keep it
- Existing API/data hooks → keep them

This task is primarily a UI refactor, not a logic rewrite.

---

## Exactness Requirements

When in doubt, bias toward the screenshot.

Specifically match:
- darkness level of the background
- rounded corner feel
- vertical rhythm
- emphasis of numeric/value displays
- relative sizes of cards and controls
- muted-vs-bright contrast
- hero glow and CTA treatment
- minimalist iconography
- premium feel of the bottom navigation

The end result should be immediately recognizable as being derived from the provided reference.

---

## What Not To Do

Do not:
- invent a different color palette
- switch to a light theme
- flatten the design into plain boxes
- use generic bootstrap/material-looking components
- overcomplicate with excessive animations
- replace existing content with fake crypto content unless the app already uses it
- break existing flows to chase aesthetics
- leave screens visually inconsistent
- claim completion while only changing the home screen

---

## Deliverables

Your output should include:
1. A clear plan of which existing screens/components are being restyled.
2. A centralized theme/token system.
3. Reusable UI primitives matching the reference style.
4. Updated screen implementations using current app content and structure.
5. Clean, maintainable React Native code.
6. A short summary of what was changed and where.

---

## Execution Mode

Proceed in this order:
1. Inspect the current app structure and identify all screens/components.
2. Identify the current navigation and major user flows.
3. Create the design tokens/theme based on the reference image.
4. Build reusable primitives first.
5. Restyle the highest-visibility screens first:
   - main/home/dashboard
   - detail or exchange-like/action screens
   - list/history/activity screens
   - settings/profile screens
6. Propagate the same visual language across the rest of the app.
7. Ensure the app still runs and behaves correctly.

Do not stop after partial styling. Complete the system.

---

## Final Quality Bar

The result must feel like:
- the same app in function
- but redesigned to visually match the attached reference almost exactly

Use the screenshot as the standard.
Use the existing app’s pages and text as the content source.

---

Before writing code, first summarize:
1. the existing screens you found,
2. the component system you will create,
3. the theme tokens you will define,
4. and how each current screen will inherit the reference design language.

Then implement.