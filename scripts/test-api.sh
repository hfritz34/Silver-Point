#!/bin/sh
# Test mock API. Start API first: cd src/api && dotnet run
BASE="${1:-http://localhost:5000}"
echo "Health:"
curl -s "$BASE/health" | head -1
echo ""
echo "Search?q=milk:"
curl -s "$BASE/api/search?q=milk"
echo ""
