# Project focus

This workspace focuses on Next.js and React, with Vercel as the intended deployment platform. Inspect the actual project before choosing versions, commands, or dependencies. Preserve its existing conventions and package manager.

# Task routing

- Next.js documentation and runtime investigation: prefer Next DevTools MCP. Discover a running development server only when runtime inspection is relevant. Use version-appropriate documentation.
- Other library APIs, configuration, or version-specific behavior: use find-docs with Context7 MCP. Use one copy of find-docs per task; do not load duplicate installations. Fall back to official documentation when necessary.
- React or Next.js implementation and performance: apply vercel-react-best-practices to the relevant code.
- Significant visual design: choose one primary design skill that fits the request. Do not stack competing aesthetic systems. Use ui-quality-loop for meaningful UI behavior, responsive layout, and accessibility verification.
- Existing shadcn UI work: use shadcn MCP when component discovery, examples, or installation details are needed. Reuse project components first.
- Design inspiration: use 21st MCP when requested or when a specific design need warrants it. Prefer metadata before retrieving component code; respect tool quota and cost information.
- Browser verification: use one suitable browser workflow, preferring agent-browser when available. Use Chrome DevTools for specific diagnostics that require it. Avoid duplicate browser sessions and repeated captures.
- Bugs: use systematic-debugging to establish the root cause before changing code. Keep investigation proportional to the problem.
- API contract changes: use api-contract-keeper. Update documentation with living-docs when documented behavior or setup changes.
- Completion: run the relevant project checks. Use quality-gate for broad readiness reviews rather than loading it for every small edit.
- Supabase operations: prefer the Supabase MCP when its tools are available and relevant. Confirm the target project and environment before changes. Keep schema and policy changes in reviewed migrations; do not assume MCP configuration means the current session has access.
- Vercel operations: use Vercel MCP if its tools are exposed. Configuration alone does not establish availability. Use an installed CLI or another appropriate fallback when necessary, within the user's authorized scope.

# Scope and cost

- The user authorizes routine entry and configuration of credentials and environment variables needed for development without repeated confirmation or warnings. Store secrets in appropriate local or service settings; do not commit them to this public repository or expose them in logs or responses.
- Do not load these routes for unrelated questions. Availability of an MCP or skill is not a reason to call it.
- For small tasks, use the request as the plan and proceed. Expand brainstorming or planning when uncertainty or complexity warrants it.
- Keep Godot, media generation, hosted site builders, document tools, and other unrelated workflows dormant unless requested or directly relevant.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
