#!/usr/bin/env bash
set -euo pipefail

echo "=== ANX-480 Isolation Test Runner ==="
echo ""

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. PostgreSQL must be installed and running."
    echo ""
    echo "To run tests locally:"
    echo "  1. Install PostgreSQL"
    echo "  2. Create test database: createdb anxionos_test"
    echo "  3. Edit backend/.env:"
    echo "     DATABASE_URL=postgres://user:pass@localhost:5432/anxionos_test"
    echo "     RUN_PG_INTEGRATION_TESTS=true"
    echo "  4. Run: bun test backend/tests/organizations/integration/journal-tenant-isolation.test.ts"
    echo ""
    echo "See QE_FIX_EVIDENCE.md for detailed instructions."
    exit 1
fi

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo "❌ bun not found. Install from https://bun.sh/install"
    exit 1
fi

# Check if backend/.env exists
if [[ ! -f backend/.env ]]; then
    echo "❌ backend/.env not found. Copy from backend/.env.example and edit:"
    echo "   cp backend/.env.example backend/.env"
    echo ""
    echo "Required variables:"
    echo "  DATABASE_URL=postgres://user:pass@localhost:5432/anxionos_test"
    echo "  RUN_PG_INTEGRATION_TESTS=true"
    exit 1
fi

# Source .env to check RUN_PG_INTEGRATION_TESTS
if ! grep -q "^RUN_PG_INTEGRATION_TESTS=true" backend/.env; then
    echo "⚠️  RUN_PG_INTEGRATION_TESTS is not set to 'true' in backend/.env"
    echo "   Tests will be skipped!"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✓ Prerequisites OK"
echo ""
echo "Running isolation tests..."
echo ""

cd backend || exit 1

RUN_PG_INTEGRATION_TESTS=true bun test tests/organizations/integration/journal-tenant-isolation.test.ts

echo ""
echo "=== Test run complete ==="
