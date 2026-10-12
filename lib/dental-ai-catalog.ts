export type DentalAIField = {path:string;optional:boolean;type:string;options?:string[];items?:DentalAIField[]};
export type DentalAITool = {id:string;method:string;clinical:boolean;label:string;fields:DentalAIField[]};
export const dentalCatalog: DentalAITool[] = [
  {
    "id": "analyze-claim",
    "method": "POST",
    "clinical": false,
    "label": "Analyze Claim",
    "fields": [
      {
        "path": "treatmentCode",
        "optional": false,
        "type": "string"
      },
      {
        "path": "treatmentName",
        "optional": false,
        "type": "string"
      },
      {
        "path": "claimedAmount",
        "optional": false,
        "type": "number"
      },
      {
        "path": "insuranceProvider",
        "optional": false,
        "type": "string"
      },
      {
        "path": "patientAge",
        "optional": true,
        "type": "number"
      },
      {
        "path": "medicalNecessity",
        "optional": true,
        "type": "string"
      }
    ]
  },
  {
    "id": "chatbot",
    "method": "POST",
    "clinical": false,
    "label": "Chatbot",
    "fields": [
      {
        "path": "question",
        "optional": false,
        "type": "string"
      },
      {
        "path": "conversationHistory",
        "optional": true,
        "type": "array",
        "items": [
          {
            "path": "role",
            "optional": false,
            "type": "enum",
            "options": [
              "user",
              "assistant"
            ]
          },
          {
            "path": "content",
            "optional": false,
            "type": "string"
          }
        ]
      },
      {
        "path": "context.patientName",
        "optional": true,
        "type": "string"
      },
      {
        "path": "context.upcomingAppointment",
        "optional": true,
        "type": "string"
      },
      {
        "path": "context.recentTreatments",
        "optional": true,
        "type": "array",
        "items": [
          {
            "path": "",
            "optional": false,
            "type": "string"
          }
        ]
      }
    ]
  },
  {
    "id": "dashboard-insights",
    "method": "GET",
    "clinical": false,
    "label": "Dashboard Insights",
    "fields": [
      {
        "path": "reviewFocus",
        "type": "string",
        "optional": true
      }
    ]
  },
  {
    "id": "generate-appeal-letter",
    "method": "POST",
    "clinical": false,
    "label": "Generate Appeal Letter",
    "fields": [
      {
        "path": "patientName",
        "optional": false,
        "type": "string"
      },
      {
        "path": "claimNumber",
        "optional": false,
        "type": "string"
      },
      {
        "path": "treatmentCode",
        "optional": false,
        "type": "string"
      },
      {
        "path": "treatmentName",
        "optional": false,
        "type": "string"
      },
      {
        "path": "denialReason",
        "optional": false,
        "type": "string"
      },
      {
        "path": "claimedAmount",
        "optional": false,
        "type": "number"
      },
      {
        "path": "insuranceProvider",
        "optional": false,
        "type": "string"
      },
      {
        "path": "dateOfService",
        "optional": false,
        "type": "string"
      },
      {
        "path": "clinicalJustification",
        "optional": true,
        "type": "string"
      },
      {
        "path": "additionalNotes",
        "optional": true,
        "type": "string"
      }
    ]
  },
  {
    "id": "generate-communication",
    "method": "POST",
    "clinical": false,
    "label": "Generate Communication",
    "fields": [
      {
        "path": "type",
        "optional": false,
        "type": "enum",
        "options": [
          "appointment_reminder",
          "post_treatment",
          "payment_reminder",
          "follow_up"
        ]
      },
      {
        "path": "patientName",
        "optional": false,
        "type": "string"
      },
      {
        "path": "appointmentDate",
        "optional": true,
        "type": "string"
      },
      {
        "path": "treatmentType",
        "optional": true,
        "type": "string"
      },
      {
        "path": "amount",
        "optional": true,
        "type": "number"
      },
      {
        "path": "instructions",
        "optional": true,
        "type": "string"
      }
    ]
  },
  {
    "id": "generate-notes",
    "method": "POST",
    "clinical": true,
    "label": "Generate Notes",
    "fields": [
      {
        "path": "treatmentType",
        "optional": false,
        "type": "string"
      },
      {
        "path": "treatmentCode",
        "optional": true,
        "type": "string"
      },
      {
        "path": "toothNumber",
        "optional": true,
        "type": "string"
      },
      {
        "path": "description",
        "optional": true,
        "type": "string"
      },
      {
        "path": "patientAge",
        "optional": true,
        "type": "number"
      },
      {
        "path": "patientHistory",
        "optional": true,
        "type": "string"
      }
    ]
  },
  {
    "id": "generate-soap-notes",
    "method": "POST",
    "clinical": true,
    "label": "Generate Soap Notes",
    "fields": [
      {
        "path": "subjective",
        "optional": true,
        "type": "string"
      },
      {
        "path": "objective",
        "optional": false,
        "type": "string"
      },
      {
        "path": "treatmentType",
        "optional": false,
        "type": "string"
      },
      {
        "path": "toothNumber",
        "optional": true,
        "type": "string"
      },
      {
        "path": "vitalSigns",
        "optional": true,
        "type": "string"
      }
    ]
  },
  {
    "id": "payment-plan-recommendation",
    "method": "POST",
    "clinical": false,
    "label": "Payment Plan Recommendation",
    "fields": [
      {
        "path": "totalAmount",
        "optional": false,
        "type": "number"
      },
      {
        "path": "patientName",
        "optional": false,
        "type": "string"
      },
      {
        "path": "urgency",
        "optional": true,
        "type": "enum",
        "options": [
          "immediate",
          "soon",
          "flexible"
        ]
      }
    ]
  },
  {
    "id": "predict-no-show",
    "method": "POST",
    "clinical": false,
    "label": "Predict No Show",
    "fields": [
      {
        "path": "appointmentId",
        "optional": true,
        "type": "string"
      },
      {
        "path": "patientId",
        "optional": true,
        "type": "string"
      }
    ]
  },
  {
    "id": "revenue-forecast",
    "method": "POST",
    "clinical": false,
    "label": "Revenue Forecast",
    "fields": [
      {
        "path": "months",
        "optional": true,
        "type": "number"
      }
    ]
  },
  {
    "id": "risk-assessment",
    "method": "POST",
    "clinical": true,
    "label": "Risk Assessment",
    "fields": [
      {
        "path": "patientAge",
        "optional": false,
        "type": "number"
      },
      {
        "path": "medicalHistory",
        "optional": false,
        "type": "array",
        "items": [
          {
            "path": "",
            "optional": false,
            "type": "string"
          }
        ]
      },
      {
        "path": "medications",
        "optional": true,
        "type": "array",
        "items": [
          {
            "path": "",
            "optional": false,
            "type": "string"
          }
        ]
      },
      {
        "path": "allergies",
        "optional": true,
        "type": "array",
        "items": [
          {
            "path": "",
            "optional": false,
            "type": "string"
          }
        ]
      },
      {
        "path": "plannedProcedure",
        "optional": false,
        "type": "string"
      },
      {
        "path": "vitalSigns.bloodPressure",
        "optional": true,
        "type": "string"
      },
      {
        "path": "vitalSigns.heartRate",
        "optional": true,
        "type": "number"
      },
      {
        "path": "smokingStatus",
        "optional": true,
        "type": "enum",
        "options": [
          "never",
          "former",
          "current"
        ]
      },
      {
        "path": "diabetic",
        "optional": true,
        "type": "boolean"
      }
    ]
  },
  {
    "id": "smart-scheduling",
    "method": "POST",
    "clinical": false,
    "label": "Smart Scheduling",
    "fields": [
      {
        "path": "treatmentType",
        "optional": false,
        "type": "string"
      },
      {
        "path": "patientId",
        "optional": false,
        "type": "string"
      },
      {
        "path": "dentistId",
        "optional": true,
        "type": "string"
      },
      {
        "path": "preferredDays",
        "optional": true,
        "type": "array",
        "items": [
          {
            "path": "",
            "optional": false,
            "type": "string"
          }
        ]
      },
      {
        "path": "preferredTimeOfDay",
        "optional": true,
        "type": "enum",
        "options": [
          "morning",
          "afternoon",
          "evening",
          "any"
        ]
      }
    ]
  },
  {
    "id": "suggest-cdt-code",
    "method": "POST",
    "clinical": true,
    "label": "Suggest Cdt Code",
    "fields": [
      {
        "path": "treatmentDescription",
        "optional": false,
        "type": "string"
      },
      {
        "path": "toothNumber",
        "optional": true,
        "type": "string"
      }
    ]
  },
  {
    "id": "translate-jargon",
    "method": "POST",
    "clinical": true,
    "label": "Translate Jargon",
    "fields": [
      {
        "path": "dentalText",
        "optional": false,
        "type": "string"
      },
      {
        "path": "includeDiagrams",
        "optional": true,
        "type": "boolean"
      }
    ]
  },
  {
    "id": "treatment-plan-summary",
    "method": "POST",
    "clinical": true,
    "label": "Treatment Plan Summary",
    "fields": [
      {
        "path": "treatments",
        "optional": false,
        "type": "array",
        "items": [
          {
            "path": "treatmentCode",
            "optional": false,
            "type": "string"
          },
          {
            "path": "treatmentName",
            "optional": false,
            "type": "string"
          },
          {
            "path": "toothNumber",
            "optional": true,
            "type": "string"
          },
          {
            "path": "estimatedCost",
            "optional": false,
            "type": "number"
          },
          {
            "path": "description",
            "optional": true,
            "type": "string"
          }
        ]
      },
      {
        "path": "patientName",
        "optional": false,
        "type": "string"
      },
      {
        "path": "totalCost",
        "optional": false,
        "type": "number"
      }
    ]
  },
  {
    "id": "treatment-recommendations",
    "method": "POST",
    "clinical": true,
    "label": "Treatment Recommendations",
    "fields": [
      {
        "path": "diagnosis",
        "optional": false,
        "type": "string"
      },
      {
        "path": "toothNumber",
        "optional": true,
        "type": "string"
      },
      {
        "path": "symptoms",
        "optional": true,
        "type": "array",
        "items": [
          {
            "path": "",
            "optional": false,
            "type": "string"
          }
        ]
      },
      {
        "path": "patientAge",
        "optional": true,
        "type": "number"
      },
      {
        "path": "medicalHistory",
        "optional": true,
        "type": "array",
        "items": [
          {
            "path": "",
            "optional": false,
            "type": "string"
          }
        ]
      },
      {
        "path": "radiographicFindings",
        "optional": true,
        "type": "string"
      },
      {
        "path": "budget",
        "optional": true,
        "type": "enum",
        "options": [
          "low",
          "medium",
          "high",
          "no_constraint"
        ]
      }
    ]
  }
]
