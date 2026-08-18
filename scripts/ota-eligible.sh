#!/usr/bin/env bash
# Is a range of commits shippable as an OTA update, or does it need a native build?
#
# ADR 0029: this is a rule, not a judgment. app.json sets
# runtimeVersion.policy = "fingerprint", so a change that leaves the native
# fingerprint untouched runs on an already-installed build and reaches a device
# via `eas update` in about two minutes. A change that moves the fingerprint
# needs a fresh build, because no installed client can run it.
#
# The list below is the set of paths that feed that fingerprint. Anything else
# is JS the bundle carries.
#
# Usage:
#   scripts/ota-eligible.sh                  # working tree vs origin/main
#   scripts/ota-eligible.sh <base> <head>    # any range, e.g. a build's commit
#
# Exit 0 = OTA-eligible, exit 1 = needs a native build.
#
# This is a fast pre-check, not the authority. Confirm with
# `eas fingerprint:compare` before publishing to production.

set -uo pipefail

BASE="${1:-origin/main}"
HEAD_REF="${2:-HEAD}"

NATIVE_PATHS='^(package\.json|package-lock\.json|app\.json|app\.config\.[jt]s|eas\.json|babel\.config\.js|metro\.config\.js|ios/|android/)'

changed="$(git diff --name-only "$BASE" "$HEAD_REF")"

if [ -z "$changed" ]; then
  echo "No changes between $BASE and $HEAD_REF."
  exit 0
fi

native="$(echo "$changed" | grep -E "$NATIVE_PATHS" || true)"

echo "Changed files: $(echo "$changed" | wc -l | tr -d ' ')"

if [ -n "$native" ]; then
  echo
  echo "NEEDS A NATIVE BUILD. These paths feed the runtime fingerprint:"
  echo "$native" | sed 's/^/  /'
  echo
  echo "  eas build -p ios --profile production --auto-submit"
  exit 1
fi

echo
echo "OTA-ELIGIBLE. Nothing here touches the native fingerprint."
echo
echo "  eas fingerprint:compare          # confirm before production"
echo "  eas update --branch preview      # agents may publish here (ADR 0029)"
echo "  eas update --branch production   # human action only (ADR 0029)"
exit 0
