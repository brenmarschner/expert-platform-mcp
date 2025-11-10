#!/bin/bash

API_URL="https://expert-platform-mcp-1.onrender.com/mcp"

echo "🧪 Testing Expert Search AI Agent & Fallback"
echo "================================================"
echo ""

test_search() {
  local query="$1"
  local expected_companies="$2"
  
  echo "Query: \"$query\""
  echo "Expected companies: $expected_companies"
  
  result=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": $RANDOM,
      \"method\": \"tools/call\",
      \"params\": {
        \"name\": \"search_experts\",
        \"arguments\": {
          \"query\": \"$query\",
          \"limit\": 5
        }
      }
    }" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['result']['content'][0]['text'])" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Results: {d['total_results']}\"); print(f\"Companies found: {', '.join(set([e['current_company'] for e in d['experts'][:3]]))}\")")
  
  echo "$result"
  echo "---"
  echo ""
  sleep 2
}

# Test 1: Specific companies mentioned
test_search "former Adobe product managers" "Adobe"
test_search "healthcare startup founders" "Various startups"
test_search "AI researchers" "Universities/research"

# Test 2: Known patterns
test_search "Big 5 search firms" "Korn Ferry, Russell Reynolds, etc"
test_search "consultants from Deloitte" "Deloitte"

# Test 3: IT resellers
test_search "CDW or SHI employees" "CDW, SHI"

# Test 4: Tech companies
test_search "Google engineering leaders" "Google"

echo "================================================"
echo "✅ Testing complete! Review Render logs for AI agent behavior"
