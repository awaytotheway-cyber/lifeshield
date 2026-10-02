#!/usr/bin/env bash
# Idempotent dependency install for the LifeShield Cloud Agent environment.
# Installs both the root Expo mobile app and the browser admin panel.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing root (Expo) dependencies"
npm ci

echo "==> Installing admin panel dependencies"
npm --prefix admin ci

echo "==> Install complete"
