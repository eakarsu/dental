#!/bin/bash

echo "Testing Treatment Plan Summary API..."
echo ""

# First login to get a session cookie
echo "Logging in..."
login_response=$(curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dentalclinic.com","password":"password123"}')

echo "Testing API endpoint..."
response=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/ai/treatment-plan-summary \
  -H "Content-Type: application/json" \
  -d '{
    "treatments": [
      {
        "treatmentCode": "D0150",
        "treatmentName": "Comprehensive Exam",
        "estimatedCost": 150
      }
    ],
    "patientName": "Test Patient",
    "totalCost": 150
  }')

echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

# Cleanup
rm -f cookies.txt

if echo "$response" | grep -q '"summary"'; then
  echo ""
  echo "✅ Treatment Plan Summary API is working!"
else
  echo ""
  echo "❌ Treatment Plan Summary API failed"
fi
