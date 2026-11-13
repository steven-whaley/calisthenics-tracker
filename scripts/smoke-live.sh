#!/usr/bin/env bash
# Post-push smoke test of the live preview deployment, signed in as the test user.
#
#   scripts/smoke-live.sh                         # login + smoke pages
#   scripts/smoke-live.sh --page /exercises/new --expect "some text"   # also wait for new behavior
#   scripts/smoke-live.sh --bundle "Timed sets (seconds)"              # new text only present in client JS
#
# Needs: vercel CLI (logged in), .env.testuser with TEST_USER_PASSWORD. Never prints the password.
set -uo pipefail
cd "$(dirname "$0")/.."

D="${DEPLOYMENT:-https://workout.dev.swvercel.io}"
PAGES=(/dashboard /templates /exercises /calendar /progress /exercises/new /coach /settings)
EXPECT_PAGE="" EXPECT_TEXT="" BUNDLE_TEXT="" TRIES=12
while [ $# -gt 0 ]; do
  case "$1" in
    --page) EXPECT_PAGE="$2"; shift 2;;
    --expect) EXPECT_TEXT="$2"; shift 2;;
    --bundle) BUNDLE_TEXT="$2"; shift 2;;
    --tries) TRIES="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

PW=$(python3 - <<'PY'
for l in open(".env.testuser"):
    l = l.strip()
    if "=" in l and "PASSWORD" in l.split("=")[0]:
        print(l.split("=", 1)[1].strip("\"'"))
PY
)
[ -n "$PW" ] || { echo "no TEST_USER_PASSWORD in .env.testuser" >&2; exit 1; }

JAR=$(mktemp); trap 'rm -f "$JAR"' EXIT
vc() { vercel curl "$1" --deployment "$D" -- -s "${@:2}" 2>/dev/null; }

# 1. Wait for the deployment to answer, then log in as the test user.
CSRF=""
for i in $(seq 1 "$TRIES"); do
  CSRF=$(vc /api/auth/csrf -c "$JAR" | python3 -c 'import sys,json;print(json.load(sys.stdin)["csrfToken"])' 2>/dev/null) && [ -n "$CSRF" ] && break
  sleep 10
done
[ -n "$CSRF" ] || { echo "FAIL: deployment not reachable / no CSRF token"; exit 1; }
code=$(vc /api/auth/callback/test-user -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" -X POST \
  --data-urlencode "csrfToken=$CSRF" --data-urlencode "password=$PW" --data-urlencode "callbackUrl=$D/dashboard")
echo "login $code"; [ "$code" = "302" ] || { echo "FAIL: login"; exit 1; }

# 2. Wait for the new behavior (a stale deployment proves nothing).
FAIL=0
if [ -n "$EXPECT_TEXT" ]; then
  ok=0
  for i in $(seq 1 "$TRIES"); do
    vc "${EXPECT_PAGE:-/dashboard}" -b "$JAR" | grep -qF "$EXPECT_TEXT" && ok=1 && break
    sleep 20
  done
  echo "expect '${EXPECT_TEXT}' on ${EXPECT_PAGE:-/dashboard}: $([ $ok = 1 ] && echo found || echo MISSING)"; [ $ok = 1 ] || FAIL=1
fi
if [ -n "$BUNDLE_TEXT" ]; then
  ok=0
  for i in $(seq 1 "$TRIES"); do
    for src in $(vc "${EXPECT_PAGE:-/exercises/new}" -b "$JAR" | grep -o '/_next/static/[^"]*\.js' | sort -u); do
      vc "$src" | grep -qF "$BUNDLE_TEXT" && ok=1 && break
    done
    [ $ok = 1 ] && break; sleep 20
  done
  echo "bundle has '${BUNDLE_TEXT}': $([ $ok = 1 ] && echo found || echo MISSING)"; [ $ok = 1 ] || FAIL=1
fi

# 3. Smoke pages must all return 200.
for p in "${PAGES[@]}"; do
  c=$(vc "$p" -b "$JAR" -o /dev/null -w "%{http_code}"); echo "$p $c"; [ "$c" = "200" ] || FAIL=1
done
[ $FAIL = 0 ] && echo "SMOKE TEST PASSED" || { echo "SMOKE TEST FAILED"; exit 1; }
