#!/usr/bin/env bash
#
# run-e2e.sh — Run ABDQuiz E2E tests
#
# Este script arranca el servidor manualmente (evita webServer de Playwright,
# que tiene problemas con cmd.exe en Windows) y ejecuta los tests E2E.
#
# ABDQuiz inyecta sesión JWT directamente (helpers/auth.ts), no necesita ABDAuth.
#
# Flujo:
#   1. Limpia puerto 3300
#   2. Arranca ABDQuiz (dev server en 3300)
#   3. Ejecuta los tests E2E de Playwright
#   4. Mata el servidor

set -e

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
PARENT_DIR="$(cd .. && pwd)"

echo "=== Step 1: Cleanup port 3300 (ABDQuiz) ==="
node "$PARENT_DIR/ABDLogs/scripts/cleanup-port.mjs" 3300 2>/dev/null || true

echo "=== Step 2: Start ABDQuiz dev server (port 3300) ==="
node node_modules/next/dist/bin/next dev -p 3300 --webpack &>/tmp/abdquiz-server.log &
QUIZ_PID=$!
echo "ABDQuiz PID: $QUIZ_PID"

cleanup() {
  echo ""
  echo "=== Cleanup: Stopping server ==="
  kill $QUIZ_PID 2>/dev/null || true
  echo "Server stopped."
}
trap cleanup EXIT INT TERM

echo "=== Step 3: Wait for ABDQuiz to be ready ==="
for i in $(seq 1 60); do
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3300 2>/dev/null || echo "000")
  if echo "$HTTP_CODE" | grep -qE '2|3'; then
    echo "QUIZ_READY after ${i}s (HTTP $HTTP_CODE)"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "QUIZ_TIMEOUT after 60s"
    tail -20 /tmp/abdquiz-server.log
    kill $QUIZ_PID 2>/dev/null
    exit 1
  fi
  sleep 2
done

echo "=== Step 4: Run Playwright E2E tests ==="
export ABDLOGS_SKIP_PORT_CLEANUP=true
timeout 600 node node_modules/@playwright/test/cli.js test --reporter=list --retries 0 --workers 1 2>&1
TEST_EXIT=$?

echo "=== Step 5: Cleanup server ==="
kill $QUIZ_PID 2>/dev/null || true

if [ $TEST_EXIT -eq 0 ]; then
  echo "=== ALL TESTS PASSED ==="
else
  echo "=== TESTS FAILED (exit: $TEST_EXIT) ==="
fi

exit $TEST_EXIT
