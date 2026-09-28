# AGENTS.md

## Commands

- **Install:** `pnpm install`
- **Dev:** `pnpm dev` (runs `ray develop`)
- **Build:** `pnpm build` (runs `ray build`; regenerates `raycast-env.d.ts`)
- **Lint/format:** `pnpm lint` (Biome: `biome check .`)
- **Fix lint/format:** `pnpm fix-lint`; unsafe fixes via `npx biome check --write --unsafe .`
- **Typecheck:** `npx tsc --noEmit`

## Toolchain

- Package manager: pnpm 12 (pnpm settings live in `pnpm-workspace.yaml`)
- Linter/formatter: Biome 2 (`biome.json`) — replaces ESLint + Prettier
- TypeScript 7 (native compiler; `types: ["node"]` is set explicitly in `tsconfig.json`)
- Raycast API 2

## Code Style

- Enforced by Biome: 2-space indent, 80-char lines, double quotes
- Node builtins use the `node:` protocol (e.g. `node:fs`)
- ES module `import` syntax, imports organized
- Naming: camelCase for variables/functions, PascalCase for components/types
- Template literals over string concatenation
- Error handling: try/catch for async, Raycast toasts for user-facing failures
- User config goes in manifest `preferences`, read via `getPreferenceValues`
