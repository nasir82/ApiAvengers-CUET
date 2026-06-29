# CI/CD Pipeline (Checkpoint 4)

The pipeline is implemented with **GitHub Actions** in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It runs on every pull
request and every push to `main`.

## Stages

1. **changes** — uses `dorny/paths-filter` to detect which service(s) changed.
   Outputs a JSON list of the affected services/frontend.
2. **test** — a matrix job that runs `npm install && npm test` **only for the
   changed services** (Jest). Fans out one job per changed component.
3. **build** — on push to `main`, builds and tags a Docker image **only for the
   changed services**, using two tags:
   - the **semantic version** from that service's `package.json` (e.g. `1.0.0`)
   - the **commit SHA**
4. **compose-validate** — validates that the self-contained `docker-compose.yml`
   still composes (`docker compose config`), a lightweight CD/deploy check.

## "Only the changed service" (efficiency)

Because both `test` and `build` use the `changes` output as their matrix source,
a change under `services/payment-service/**` runs the payment tests and builds the
payment image only — the other services are skipped. This mirrors real-world
microservice pipelines.

## Semantic versioning

Each service carries a semantic version in its `package.json` (`version` field,
e.g. `1.0.2`). The build stage tags images with that version, so releases and
images are traceable to a version. Bump the version when a service changes.

## Gating merges (branch protection)

The pipeline provides the required PR checks. To enforce "no merge unless CI
succeeds", enable branch protection on `main` in **GitHub → Settings → Branches**:

- Require a pull request before merging
- Require status checks to pass → select the `test (...)` checks
- (optional) Require branches to be up to date before merging

## Publishing images (optional)

The `build` stage builds and tags but does not push (no registry credentials are
assumed). To publish: add registry secrets, then `docker login` and
`docker push` both tags in the build job.

## Running tests locally

```bash
cd services/payment-service   # or any service
npm install
npm test                      # jest
```
