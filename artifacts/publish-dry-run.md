# npm publication dry run (GH-086)

Simulated release: **0.1.0-alpha.2** on dist-tag **canary**. No registry publish executed.

## Plan

- Publish order (dependency-first): @bundar/core → @bundar/jsx → @bundar/schema → @bundar/forms → @bundar/security → @bundar/htmx → @bundar/testing → @bundar/cli → create-bundar
- Inter-package dependencies synchronized to the simulated version in every packed manifest (the form `npm publish` emits).

## Verification

| Check | Status | Detail |
| --- | --- | --- |
| pack+version-sync | pass | 9/9 tarballs at 0.1.0-alpha.2 |
| no-unpublished-paths @bundar/core | pass | inter-deps synchronized |
| exports @bundar/core | pass | 1 entry points resolve in-tarball |
| metadata @bundar/core | pass | license/description/repository present |
| readme @bundar/core | pass | README ships |
| no-unpublished-paths @bundar/jsx | pass | inter-deps synchronized |
| exports @bundar/jsx | pass | 3 entry points resolve in-tarball |
| metadata @bundar/jsx | pass | license/description/repository present |
| readme @bundar/jsx | pass | README ships |
| no-unpublished-paths @bundar/schema | pass | inter-deps synchronized |
| exports @bundar/schema | pass | 1 entry points resolve in-tarball |
| metadata @bundar/schema | pass | license/description/repository present |
| readme @bundar/schema | pass | README ships |
| no-unpublished-paths @bundar/forms | pass | inter-deps synchronized |
| exports @bundar/forms | pass | 1 entry points resolve in-tarball |
| metadata @bundar/forms | pass | license/description/repository present |
| readme @bundar/forms | pass | README ships |
| no-unpublished-paths @bundar/security | pass | inter-deps synchronized |
| exports @bundar/security | pass | 1 entry points resolve in-tarball |
| metadata @bundar/security | pass | license/description/repository present |
| readme @bundar/security | pass | README ships |
| no-unpublished-paths @bundar/htmx | pass | inter-deps synchronized |
| exports @bundar/htmx | pass | 3 entry points resolve in-tarball |
| metadata @bundar/htmx | pass | license/description/repository present |
| readme @bundar/htmx | pass | README ships |
| no-unpublished-paths @bundar/testing | pass | inter-deps synchronized |
| exports @bundar/testing | pass | 1 entry points resolve in-tarball |
| metadata @bundar/testing | pass | license/description/repository present |
| readme @bundar/testing | pass | README ships |
| no-unpublished-paths @bundar/cli | pass | inter-deps synchronized |
| exports @bundar/cli | pass | 1 entry points resolve in-tarball |
| metadata @bundar/cli | pass | license/description/repository present |
| readme @bundar/cli | pass | README ships |
| no-unpublished-paths create-bundar | pass | inter-deps synchronized |
| exports create-bundar | pass | 1 entry points resolve in-tarball |
| metadata create-bundar | pass | license/description/repository present |
| readme create-bundar | pass | README ships |
| clean-install | pass | tarballs install as file: deps |
| entry-points-import | pass | @bundar/core,@bundar/jsx,@bundar/schema,@bundar/security,@bundar/htmx,@bundar/htmx/2,@bundar/htmx/4,@bundar/testing |
| jsx-runtime | pass | default JSX runtime resolves through the installed @bundar/jsx |
| tsx-typecheck | pass | TSX typechecks with jsxImportSource @bundar/jsx |
| cli-from-tarball | pass | `bundar info` executed from the installed tarball |
