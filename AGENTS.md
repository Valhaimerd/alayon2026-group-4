# Project focus

This workspace uses Laravel 13, React, Inertia and Vite after the authorized Next.js conversion. Supabase Auth/PostgreSQL and existing RLS remain authoritative. Use Composer for PHP and npm for frontend dependencies. Deploy on a PHP-capable host with `public/` as document root; the former Next.js/Vercel workflow is historical. Inspect the project before choosing versions, commands or dependencies.

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

## Laravel migration conventions

- React UI and unchanged styles live in `resources/`; website routes and action controllers live in `routes/` and `app/Http/`.
- Use user JWTs through `App\Services\SupabaseClient`; do not replace RLS with a service-role bypass.
- Scheduling schema stays in `supabase/migrations/`; `php artisan migrate` is not its installer.
- Run `npm run lint`, `npm test`, `composer test`, `npm run build` and relevant browser checks. Preserve the welcome page, map, CSS and existing account/MFA flows.
