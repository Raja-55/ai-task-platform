# AI Task Platform – Infrastructure Repo

This repo contains Kubernetes manifests (Kustomize) for deploying the AI Task Platform via Argo CD (GitOps).

- Base manifests: `k8s/base`
- Example overlays: `k8s/overlays/staging`, `k8s/overlays/production`
- Argo CD Application example: `argocd/application.yaml`
