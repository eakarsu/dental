#!/bin/bash

echo "Testing Chatbot API..."
echo ""

response=$(curl -s -X POST http://localhost:3000/api/ai/chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are your office hours?"
  }')

echo "Response:"
echo "$response" | jq -r '.answer // .error // .'

if echo "$response" | grep -q '"answer"'; then
  echo ""
  echo "✅ Chatbot API is working!"
  exit 0
else
  echo ""
  echo "❌ Chatbot API failed"
  echo "Full response:"
  echo "$response" | jq '.'
  exit 1
fi
