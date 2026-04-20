---
description: "Use when editing frontend React and TypeScript source files in PixelLyric. Covers component vs hook responsibility, service boundaries, shared types, alias imports, responsive UI, loading and feedback states, and scalable project structure."
applyTo:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Frontend Engineering Guidelines

## Goal
- Keep code easy to read and review.
- Keep responsibilities separated and predictable.
- Prefer structures that can scale with the product over time.

---

## Project Structure

Use the existing `src/` structure consistently:

- `components/` for presentational UI
- `hooks/` for reusable behavior, state, and orchestration
- `lib/` for domain logic, serialization, browser APIs, and non-UI utilities
- `types/` for shared type definitions
- `configs/` for constants and project-level configuration
- `_test_/` for test files

Create new top-level folders only when the responsibility is clearly distinct and reusable.

---

## Components

- Components should focus on UI composition and rendering.
- Components should receive data and callbacks through props.
- Keep business logic out of components when it can live in a hook or `lib/` module.
- Do not call APIs or browser persistence logic directly from complex UI components unless the component is explicitly the integration boundary.

---

## Hooks

- Hooks own reusable logic, local state, and side effects.
- Hook names must start with `use`.
- Move repeated component logic into a hook once the pattern is proven reusable.

---

## Domain Logic And Services

- Keep API calls, file-system access, serialization, and domain helpers in `lib/` or a dedicated service layer.
- Do not scatter network or storage access across multiple UI components.
- Prefer small modules with a single clear responsibility.

---

## State

- Use global state only when multiple distant parts of the app genuinely need the same source of truth.
- Keep feature-local state close to the hook or component that owns it.

---

## Naming Conventions

- Component names: `PascalCase`
- Hook names: `useSomething`
- Constants: `UPPER_SNAKE_CASE`
- Types and interfaces: `PascalCase`
- Variables and functions: `camelCase`

---

## File Naming

- Use `kebab-case` for file names.
- Component files should use descriptive `kebab-case` names, for example `lcd-preview-stage.tsx`.
- Hook files must start with `use-`, for example `use-lcd-studio.ts`.
- Shared type files should use domain-oriented names such as `audio.ts`, `project.ts`, or `lcd.ts`.
- Avoid vague names such as `utils2.ts`, `temp.ts`, or `new-file.ts`.

---

## Imports

- Prefer the `@/` alias for cross-folder imports.
- Avoid deep relative imports such as `../../` when an alias keeps the dependency clearer.

---

## Data Flow

- Data should flow down through props.
- User intent and state updates should flow up through callbacks or controlled state transitions.
- Avoid hidden coupling between sibling components.

---

## Error Handling

- Surface API, storage, and parsing failures to the user through a dialog, alert, or toast.
- Do not fail silently.
- Keep error messages actionable when possible.

---

## UX Baseline

- Any async action should expose a loading state when the delay is user-visible.
- Any meaningful user action should provide feedback.
- Disabled, pending, success, and error states should be intentional.

---

## Responsive Design

- Layouts must remain usable from tablet size upward.
- Design for tablet, laptop, and desktop from the start rather than patching responsiveness later.
- Avoid fixed dimensions that break content flow or editing workflows.

---

## Reusability

- If the same pattern appears in two or more places, consider extracting a shared component, hook, or `lib/` helper.
- Reuse should improve clarity, not just reduce line count.

---

## Anti-Patterns

- Large amounts of business logic inside UI components
- Copying shared types across modules
- Duplicated state for the same source of truth
- Silent error handling
- File and folder placement that hides ownership or responsibility

---

## Testing

- Important components and hooks should be testable.
- At minimum, cover rendering and key interactions where practical.
- Store new test files in a `_test_/` folder instead of colocating them with production files.

Example structure:

```text
components/
  _test_/
    btn.test.ts
  btn.tsx
```

---

## Summary

- Components render UI.
- Hooks manage behavior.
- `lib/` and service-style modules handle domain and platform logic.
- Clear boundaries make the codebase easier to change safely.