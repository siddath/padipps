# Deliver a reproducible local environment

Continue the same learner-owned capstone from [the shared brief](../fde-capstone/README.md): fictional Aster and Birch tenants, Slack, a HubSpot stub and permissioned documents. Copy these starters into its `delivery/environments/` folder; keep the application, database and authorization code you already wrote. This is one evolving project, not a replacement implementation.

First explain where environment drift has appeared in your own work. Then revisit discovery: who installs this, which restrictions apply, what first successful task proves the installation, and who owns recovery? Record unknowns in your learning record.

## Independent VS Code work

1. Complete `Dockerfile.todo` as `Dockerfile`, a dependency lock, a minimal build context and a `.dockerignore`. Choose and record actual supported versions and an immutable image identity. The shipped file is deliberately non-buildable and contains no application solution.
2. Complete `chart/values.yaml` and `chart/templates/workload.yaml` yourself. Define the application and stub dependencies, configuration references, service, readiness/liveness behavior, bounded resources and permissions. Explain which state persists across a workload replacement. Use synthetic documents and stub credentials only.
3. Run the application container's Aster/Birch happy and denial scenarios using the tests you authored earlier. Then install the same artifact in a disposable local Kubernetes environment. For a `kind` example, the named context is `kind-padipps-fde`; verify it before every mutation. Do not target a current/default or customer context.
4. Introduce a bad image reference or failing readiness check in a separate local values file. Demonstrate the rollout failure, recover using the previous release or a justified repair, and rerun the same acceptance scenarios. Explain why workload rollback cannot undo arbitrary data changes.
5. Turn `pipeline.yaml.example` into your own reviewed CI/CD proposal. Tests, image build, artifact identity and chart validation should precede any proposed promotion. Keep credentials and deployments disabled here. A proposal is not an executed pipeline.

## Commands and runtime requirements

Node.js 20+ can inspect the fixture. Actual runtime evidence requires Docker, `kubectl`, Helm and a disposable Kubernetes cluster such as kind, plus your independently completed app. Install tools separately using their official instructions; record `docker version`, `kubectl version --client`, `helm version` and `kind version`. No tools or cluster are provisioned by this starter.

From your capstone after completing the files:

```bash
docker build -f delivery/environments/Dockerfile -t padipps-fde:local .
docker image inspect padipps-fde:local
helm lint delivery/environments/chart
helm template padipps-fde delivery/environments/chart --namespace padipps-fde > rendered-local.yaml
kind create cluster --name padipps-fde
kind load docker-image padipps-fde:local --name padipps-fde
kubectl --context kind-padipps-fde cluster-info
helm upgrade --install padipps-fde delivery/environments/chart --kube-context kind-padipps-fde --namespace padipps-fde --create-namespace --wait
kubectl --context kind-padipps-fde --namespace padipps-fde get deployments,pods,services
helm history padipps-fde --kube-context kind-padipps-fde --namespace padipps-fde
```

The local chart starts with a deliberate template failure. Choose explicit wait/timeout values for your setup and label them exercise assumptions. After installing a deliberately bad release, inspect history and the actual revision you intend to recover; do not assume a revision number. Use that verified revision with `helm rollback`. Repeat the documented installation in a second fresh local environment. Record CI commands and their actual outputs only if you run your own pipeline; otherwise mark CI runtime evidence absent.

## Return evidence

Complete `delivery-receipt.md`: release inputs, actual commands/output, Aster/Birch acceptance results, clean-install comparison, fault and recovery receipts, security assumptions, and unresolved gaps. Link the artifact and results in your learning record. Helm rendering proves generated text, not Kubernetes behavior. A passing local install does not prove production availability, isolation, or compliance. Missing tool access is an explicit not-run result; resume the exercise when available.

Sources: [Docker build practices](https://docs.docker.com/build/building/best-practices/), [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), [Helm chart templates](https://helm.sh/docs/chart_template_guide/getting_started/), [GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments).
