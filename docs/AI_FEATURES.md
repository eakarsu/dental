# AI Features Documentation

This document describes all the AI-powered features integrated into the Dental SaaS application using OpenRouter API.

## 🔑 Setup

The AI features use OpenRouter API with your API key stored in `.env`:
```
OPENROUTER_API_KEY=your_key_here
```

All AI endpoints use **Google Gemini 3 Pro Preview** by default - a powerful model with advanced reasoning capabilities for high-quality medical/dental text generation.

---

## ✨ Implemented AI Features

### 1. **AI Treatment Notes Generator**

**Location**: Treatment creation & edit pages
**Endpoint**: `POST /api/ai/generate-notes`

**What it does:**
- Automatically generates professional clinical treatment notes
- Creates comprehensive documentation including:
  - Chief complaint
  - Clinical findings
  - Procedure performed
  - Materials used
  - Patient tolerance
  - Post-operative instructions
  - Follow-up recommendations

**How to use:**
1. Navigate to **Treatments → New Treatment** or **Edit Treatment**
2. Fill in at least the treatment name
3. Click **"AI Generate Notes"** button
4. AI will populate the notes field with professional documentation

**Input:**
```json
{
  "treatmentType": "Root Canal",
  "treatmentCode": "D3310",
  "toothNumber": "14",
  "description": "Painful tooth, sensitivity to cold"
}
```

**Output:** Professional clinical notes ready to save

---

### 2. **AI CDT Code Suggester**

**Location**: Treatment creation & edit pages
**Endpoint**: `POST /api/ai/suggest-cdt-code`

**What it does:**
- Suggests appropriate CDT (Current Dental Terminology) codes
- Provides primary code, description, explanation
- Suggests alternative codes to consider

**How to use:**
1. Navigate to **Treatments → New Treatment** or **Edit Treatment**
2. Enter a treatment name or description
3. Click **"AI Suggest CDT Code"** button
4. AI will populate the CDT code and official description

**Input:**
```json
{
  "treatmentDescription": "Comprehensive oral evaluation for new patient",
  "toothNumber": null
}
```

**Output:**
```json
{
  "primaryCode": "D0150",
  "primaryDescription": "Comprehensive oral evaluation - new or established patient",
  "explanation": "This code is appropriate for a thorough examination...",
  "alternativeCodes": [
    {
      "code": "D0120",
      "description": "Periodic oral evaluation - established patient"
    }
  ]
}
```

---

### 3. **AI Insurance Claim Analyzer**

**Endpoint**: `POST /api/ai/analyze-claim`

**What it does:**
- Analyzes insurance claims for denial risk
- Identifies potential issues before submission
- Provides recommendations to improve approval chances
- Generates medical necessity statements
- Estimates approval amounts

**How to use (API):**
```javascript
const response = await fetch('/api/ai/analyze-claim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    treatmentCode: "D3310",
    treatmentName: "Root Canal - Anterior",
    claimedAmount: 950,
    insuranceProvider: "Blue Cross Blue Shield",
    patientAge: 45,
    medicalNecessity: "Tooth #8 with irreversible pulpitis"
  })
})
```

**Output:**
```json
{
  "denialRisk": "low",
  "riskFactors": ["Standard procedure", "Age-appropriate"],
  "recommendations": [
    "Include pre-operative X-rays",
    "Document pain levels"
  ],
  "requiredDocumentation": [
    "Pre-operative radiographs",
    "Clinical examination notes"
  ],
  "medicalNecessityStatement": "Patient presents with irreversible pulpitis...",
  "estimatedApprovalAmount": 950,
  "tips": ["Submit within 30 days", "Include all documentation"]
}
```

---

### 4. **AI Patient Communication Generator**

**Endpoint**: `POST /api/ai/generate-communication`

**What it does:**
- Generates personalized patient messages for various scenarios:
  - Appointment reminders
  - Post-treatment care instructions
  - Payment reminders
  - Follow-up check-ins

**How to use (API):**
```javascript
// Appointment Reminder
const response = await fetch('/api/ai/generate-communication', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: "appointment_reminder",
    patientName: "John Doe",
    appointmentDate: "2025-12-01T10:00:00Z",
    treatmentType: "Dental Cleaning"
  })
})
```

**Message Types:**

1. **Appointment Reminder** (`appointment_reminder`)
   - Friendly reminder with date/time
   - Instructions to arrive 10 minutes early
   - Contact info for rescheduling

2. **Post-Treatment Instructions** (`post_treatment`)
   - What to expect (pain, swelling)
   - Do's and don'ts
   - When to call the office
   - Medication reminders

3. **Payment Reminder** (`payment_reminder`)
   - Polite, non-confrontational
   - Payment options
   - Offer to discuss payment plans

4. **Follow-Up** (`follow_up`)
   - Check on recovery
   - Ask about concerns
   - Remind of next appointment

---

### 5. **AI Dashboard Insights**

**Endpoint**: `GET /api/ai/dashboard-insights`

**What it does:**
- Analyzes practice statistics and provides insights
- Identifies trends and patterns
- Provides actionable recommendations

**Insights include:**
- Practice growth and patient engagement
- Operational efficiency metrics
- Revenue cycle analysis
- Specific recommendations for improvement

**How to use (API):**
```javascript
const response = await fetch('/api/ai/dashboard-insights')
const data = await response.json()
console.log(data.insights)
```

**Output:**
```json
{
  "insights": [
    {
      "title": "Strong Patient Growth",
      "description": "Your practice has grown 15% in total patients this month...",
      "type": "positive",
      "actionable": "Consider hiring additional staff to maintain service quality"
    },
    {
      "title": "High Cancellation Rate",
      "description": "You have 3x more cancellations than usual this week...",
      "type": "warning",
      "actionable": "Implement reminder calls 24 hours before appointments"
    }
  ]
}
```

---

## 🎨 UI Integration Summary

### Treatment Pages
- **New Treatment** (`/dashboard/treatments/new`):
  - ✅ AI Suggest CDT Code button
  - ✅ AI Generate Notes button

- **Edit Treatment** (`/dashboard/treatments/[id]/edit`):
  - ✅ AI Suggest CDT Code button
  - ✅ AI Generate Notes button

### Future UI Integration Opportunities
- **Dashboard**: Add AI Insights widget showing practice recommendations
- **Claims Page**: Add "Analyze Claim" button before submission
- **Appointments**: Add "Generate Communication" for reminders/follow-ups
- **Patient Portal**: AI-powered FAQ chatbot

---

## 🔧 Technical Architecture

### OpenRouter Service (`lib/openrouter.ts`)
Centralized service for all AI API calls:
- Uses Claude 3.5 Sonnet by default
- Configurable temperature and max tokens
- Centralized error handling
- Authentication via Bearer token

### API Endpoints Structure
All AI endpoints follow this pattern:
1. **Authentication check** - Verify user session
2. **Input validation** - Zod schema validation
3. **AI prompt construction** - Context-aware prompts
4. **OpenRouter API call** - Using centralized service
5. **Response parsing** - Extract and format AI output
6. **Error handling** - Graceful failures

### Security Considerations
- All endpoints require authentication
- API key stored securely in `.env`
- No patient identifiable information sent to AI in most cases
- Consider HIPAA-compliant AI services for production

---

## 📊 Cost Optimization Tips

1. **Use appropriate temperature:**
   - Low (0.2-0.3) for factual tasks (CDT codes, medical necessity)
   - Medium (0.5-0.7) for creative tasks (patient communications)

2. **Set max_tokens appropriately:**
   - Short responses (200-500 tokens): Code suggestions
   - Medium responses (500-1000 tokens): Patient messages
   - Long responses (1000-2000 tokens): Clinical notes, insights

3. **Cache common prompts** when possible

4. **Monitor usage** through OpenRouter dashboard

---

## 🚀 Future Enhancements

### Planned Features:
1. **Voice-to-Text Clinical Notes** - Dentists dictate, AI transcribes and structures
2. **Treatment Plan Optimizer** - AI suggests optimal treatment sequences
3. **X-ray Analysis Assistant** - AI helps identify potential issues (requires FDA approval)
4. **Smart Scheduling** - AI predicts optimal appointment times based on patterns
5. **Revenue Forecasting** - Predict monthly revenue with AI models
6. **Patient Risk Stratification** - Identify high-risk patients proactively

### Quick Wins to Implement Next:
1. Add AI Insights widget to dashboard homepage
2. Add "Analyze Claim" button to claims creation/edit
3. Add "Generate Communication" to appointment details page
4. Create patient FAQ chatbot component

---

## 🐛 Troubleshooting

### "Failed to generate notes"
- Check OpenRouter API key is set in `.env`
- Verify you have credits in OpenRouter account
- Check network connectivity

### "Validation error"
- Ensure required fields are filled (e.g., treatment name)
- Check input format matches API schema

### AI generates incorrect codes
- Provide more detailed treatment description
- Include tooth number when relevant
- Verify against official CDT code manual

---

## 📞 Support

For issues with AI features:
1. Check OpenRouter API status: https://openrouter.ai/status
2. Review error logs in browser console
3. Verify `.env` configuration
4. Test API endpoints directly using tools like Postman

---

## 📝 Example Workflows

### Workflow 1: Creating a Treatment with AI Assistance
1. Click "New Treatment"
2. Select patient and dentist
3. Enter treatment description: "Crown preparation on upper right first molar"
4. Click "AI Suggest CDT Code" → AI fills in D2740
5. Add clinical observations
6. Click "AI Generate Notes" → AI creates professional documentation
7. Review and save

### Workflow 2: Analyzing a Claim Before Submission
1. Create insurance claim
2. Fill in treatment and cost details
3. Call `/api/ai/analyze-claim` with claim data
4. Review denial risk and recommendations
5. Add required documentation
6. Use AI-generated medical necessity statement
7. Submit with confidence

---

**Last Updated**: November 2025
**AI Model**: Google Gemini 3 Pro Preview via OpenRouter
**Status**: ✅ Fully Implemented and Integrated
