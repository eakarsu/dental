# AI Frontend Implementation Plan

## Summary
This document outlines the plan to add UI buttons for 8 missing AI features that have backend APIs but no frontend integration.

## Missing Features

### 1. ✅ **AI Generate Appeal Letter** (Priority: HIGH)
- **Location**: Claims Details Page (`/dashboard/claims/[id]`)
- **Trigger**: Show button only for DENIED claims
- **Endpoint**: `POST /api/ai/generate-appeal-letter`
- **Input Required**:
  - patientName, claimNumber, treatmentCode, treatmentName
  - denialReason, claimedAmount, insuranceProvider, dateOfService
  - Optional: clinicalJustification, additionalNotes
- **Output**: Full professional appeal letter
- **UI**: Modal/Dialog showing the generated letter with copy button

### 2. ✅ **AI Predict No-Show** (Priority: HIGH)
- **Location**: Appointment Details Page (`/dashboard/appointments/[id]`)
- **Endpoint**: `POST /api/ai/predict-no-show`
- **Input**: `{ appointmentId: string }`
- **Output**:
  - riskLevel: "low" | "medium" | "high"
  - probability: number
  - riskFactors: string[]
  - recommendations: string[]
  - confidenceScore: number
- **UI**: Card showing risk level with colored indicator, factors, and recommendations

### 3. ✅ **AI Risk Assessment** (Priority: HIGH)
- **Location**: Patient Details Page (`/dashboard/patients/[id]`)
- **Endpoint**: `POST /api/ai/risk-assessment`
- **Input Required**:
  - patientAge, medicalHistory[], plannedProcedure
  - Optional: medications[], allergies[], vitalSigns, smokingStatus, diabetic
- **Output**: Comprehensive risk assessment with categories, specific risks, precautions
- **UI**: Modal with form to input procedure details, then show detailed risk breakdown

### 4. **AI Treatment Recommendations** (Priority: MEDIUM)
- **Location**: Patient Details Page (`/dashboard/patients/[id]`)
- **Endpoint**: `POST /api/ai/treatment-recommendations`
- **Input**: Patient data + current conditions
- **Output**: Recommended treatment plans
- **UI**: Card showing recommended treatments based on patient history

### 5. **AI Smart Scheduling** (Priority: MEDIUM)
- **Location**: Appointments Calendar Page (`/dashboard/appointments`)
- **Endpoint**: `POST /api/ai/smart-scheduling`
- **Input**: Patient preferences, treatment type, practice schedule
- **Output**: Optimal appointment time suggestions
- **UI**: Button to get AI suggestions when scheduling new appointment

### 6. **AI Translate Jargon** (Priority: MEDIUM)
- **Location**: Treatment Details Page (`/dashboard/treatments/[id]`)
- **Endpoint**: `POST /api/ai/translate-jargon`
- **Input**: Medical/dental term or description
- **Output**: Patient-friendly explanation
- **UI**: Button next to treatment name/description to get plain language version

### 7. **AI Treatment Plan Summary** (Priority: MEDIUM)
- **Location**: Patient Details Page OR Treatment Plan View
- **Endpoint**: `POST /api/ai/treatment-plan-summary`
- **Input**: List of treatments for patient
- **Output**: Patient-friendly summary of entire treatment plan
- **UI**: Button to generate summary that patient can understand

### 8. **AI Generate SOAP Notes** (Priority: LOW)
- **Location**: Treatment Create/Edit Pages
- **Endpoint**: `POST /api/ai/generate-soap-notes`
- **Input**: Treatment details, patient complaints, observations
- **Output**: Structured SOAP notes (Subjective, Objective, Assessment, Plan)
- **UI**: Alternative to "AI Generate Notes" button, creates SOAP format specifically

## Implementation Order

### Phase 1 (Immediate - High Priority)
1. AI Generate Appeal Letter - Claims page
2. AI Predict No-Show - Appointment details
3. AI Risk Assessment - Patient details

### Phase 2 (Next - Medium Priority)
4. AI Treatment Recommendations - Patient details
5. AI Smart Scheduling - Appointments calendar
6. AI Translate Jargon - Treatment details

### Phase 3 (Later - Low Priority)
7. AI Treatment Plan Summary - Patient/treatment plan
8. AI Generate SOAP Notes - Treatment create/edit

## Technical Notes

- All features require authentication (session check)
- Use consistent UI patterns: AutoAwesomeIcon for AI buttons
- Show loading states with CircularProgress
- Display results in modals/dialogs for detailed output
- Add error handling and user-friendly error messages
- Use MUI components for consistency
- Add console logging for debugging

## Files to Modify

1. `/app/dashboard/claims/[id]/page.tsx` - Add Appeal Letter button
2. `/app/dashboard/appointments/[id]/page.tsx` - Create this file + Add No-Show prediction
3. `/app/dashboard/patients/[id]/page.tsx` - Add Risk Assessment & Treatment Recommendations
4. `/app/dashboard/appointments/page.tsx` - Add Smart Scheduling
5. `/app/dashboard/treatments/[id]/page.tsx` - Add Translate Jargon
6. `/app/dashboard/treatments/new/page.tsx` - Add SOAP Notes option
7. `/app/dashboard/treatments/[id]/edit/page.tsx` - Add SOAP Notes option

## Next Steps

1. Implement Phase 1 features (3 high-priority features)
2. Test each feature thoroughly
3. Apply JSON repair logic from payment-plan-recommendation to all new endpoints
4. Document any issues encountered
5. Proceed to Phase 2 and 3 based on user feedback
