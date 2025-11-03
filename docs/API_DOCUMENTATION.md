# 📚 AI Accounting Agent - Complete API Documentation

**Version**: 1.0  
**Last Updated**: 2025-11-03  
**Base URL**: `https://your-domain.com/api/ai-agent`

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Dual Review System API](#dual-review-system-api)
3. [Checklist Manager API](#checklist-manager-api)
4. [ROI Calculator API](#roi-calculator-api)
5. [AI Agent Core API](#ai-agent-core-api) (Routes to be implemented)
6. [Fraud Detection API](#fraud-detection-api) (Routes to be implemented)
7. [USA Compliance API](#usa-compliance-api) (Routes to be implemented)
8. [Mexico Compliance API](#mexico-compliance-api) (Routes to be implemented)
9. [Reporting Engine API](#reporting-engine-api) (Routes to be implemented)
10. [Predictive Analytics API](#predictive-analytics-api) (Routes to be implemented)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication

All API endpoints require authentication using JWT tokens.

### Request Headers

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### User Roles

- **admin**: Full access to all features
- **headAccountant**: Management access, can configure settings
- **accountant**: Standard accounting operations
- **assistant**: Read-only access to most features

---

## 🔄 Dual Review System API

**Base Path**: `/api/ai-agent/dual-review`

### 1. Get Configuration

Get current dual review configuration.

**Endpoint**: `GET /config`

**Auth Required**: ✅ (admin, headAccountant, accountant)

**Query Parameters**:
```
organizationId: string (required)
branchId: string (optional)
country: string (required) - "USA" or "Mexico"
```

**Example Request**:
```http
GET /api/ai-agent/dual-review/config?organizationId=507f1f77bcf86cd799439011&country=USA
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "organizationId": "507f1f77bcf86cd799439011",
    "country": "USA",
    "autoProcessing": {
      "enabled": true,
      "lastModified": "2025-11-03T10:30:00Z",
      "lastModifiedBy": "507f1f77bcf86cd799439012"
    },
    "thresholds": {
      "amount": 10000,
      "riskScore": 70,
      "fraudConfidence": 80
    },
    "roleBasedRules": {
      "admin": {
        "autoApprove": true,
        "maxAmount": 100000,
        "bypassReview": true
      },
      "headAccountant": {
        "autoApprove": true,
        "maxAmount": 50000,
        "bypassReview": false
      },
      "accountant": {
        "autoApprove": false,
        "maxAmount": 10000,
        "bypassReview": false
      }
    },
    "mandatoryReviewCases": [
      "international_wire_transfer",
      "vendor_setup",
      "bank_account_change",
      "tax_authority_payment"
    ]
  }
}
```

---

### 2. Update Configuration

Update dual review configuration thresholds.

**Endpoint**: `PUT /config`

**Auth Required**: ✅ (admin, headAccountant)

**Request Body**:
```json
{
  "organizationId": "507f1f77bcf86cd799439011",
  "branchId": null,
  "country": "USA",
  "updates": {
    "thresholds": {
      "amount": 15000,
      "riskScore": 75,
      "fraudConfidence": 85
    },
    "roleBasedRules": {
      "accountant": {
        "autoApprove": false,
        "maxAmount": 12000,
        "bypassReview": false
      }
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "organizationId": "507f1f77bcf86cd799439011",
    "country": "USA",
    "autoProcessing": {
      "enabled": true,
      "lastModified": "2025-11-03T11:45:00Z",
      "lastModifiedBy": "507f1f77bcf86cd799439012"
    },
    "thresholds": {
      "amount": 15000,
      "riskScore": 75,
      "fraudConfidence": 85
    }
  },
  "message": "Configuración actualizada exitosamente"
}
```

---

### 3. Toggle Auto-Processing 🔴 (MOST IMPORTANT)

Enable or disable automatic AI processing.

**Endpoint**: `POST /toggle`

**Auth Required**: ✅ (admin, headAccountant)

**Request Body**:
```json
{
  "organizationId": "507f1f77bcf86cd799439011",
  "branchId": null,
  "country": "USA",
  "enabled": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "organizationId": "507f1f77bcf86cd799439011",
    "country": "USA",
    "autoProcessing": {
      "enabled": false,
      "lastModified": "2025-11-03T12:00:00Z",
      "lastModifiedBy": "507f1f77bcf86cd799439012"
    },
    "previousState": true,
    "newState": false
  },
  "message": "✅ Procesamiento automático DESACTIVADO. Todas las transacciones requerirán revisión humana."
}
```

**Toggle ON Response**:
```json
{
  "success": true,
  "data": {
    "organizationId": "507f1f77bcf86cd799439011",
    "country": "USA",
    "autoProcessing": {
      "enabled": true,
      "lastModified": "2025-11-03T12:05:00Z",
      "lastModifiedBy": "507f1f77bcf86cd799439012"
    },
    "previousState": false,
    "newState": true
  },
  "message": "✅ Procesamiento automático ACTIVADO. Las transacciones se procesarán automáticamente según umbrales configurados."
}
```

---

### 4. Get Review Queue

Get list of transactions awaiting review.

**Endpoint**: `GET /queue`

**Auth Required**: ✅ (admin, headAccountant, accountant)

**Query Parameters**:
```
organizationId: string (required)
branchId: string (optional)
status: string (optional) - "pending", "in_progress", "approved", "rejected"
priority: string (optional) - "critical", "high", "medium", "low"
assignedTo: string (optional) - user ID
page: number (optional, default: 1)
limit: number (optional, default: 20)
sortBy: string (optional, default: "priority")
sortOrder: string (optional, default: "desc")
```

**Example Request**:
```http
GET /api/ai-agent/dual-review/queue?organizationId=507f1f77bcf86cd799439011&status=pending&priority=critical&page=1&limit=20
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "transactionId": "507f1f77bcf86cd799439021",
        "transactionType": "vendor_payment",
        "organizationId": "507f1f77bcf86cd799439011",
        "amount": 45000,
        "currency": "USD",
        "description": "Large vendor payment - New vendor",
        "riskScore": 75,
        "fraudConfidence": 65,
        "priority": "critical",
        "status": "pending",
        "reason": "large_amount_new_vendor",
        "aiAnalysis": {
          "recommendation": "review_required",
          "concerns": [
            "New vendor with no history",
            "Amount exceeds threshold ($10,000)",
            "Wire transfer to foreign account"
          ],
          "confidence": 0.92
        },
        "createdAt": "2025-11-03T10:30:00Z",
        "escalationLevel": 1
      },
      {
        "_id": "507f1f77bcf86cd799439022",
        "transactionId": "507f1f77bcf86cd799439023",
        "transactionType": "expense_reimbursement",
        "organizationId": "507f1f77bcf86cd799439011",
        "amount": 12500,
        "currency": "USD",
        "description": "Travel expenses - CEO",
        "riskScore": 45,
        "fraudConfidence": 20,
        "priority": "high",
        "status": "pending",
        "reason": "amount_threshold_exceeded",
        "aiAnalysis": {
          "recommendation": "approve_with_review",
          "concerns": [
            "Amount above standard threshold"
          ],
          "confidence": 0.88
        },
        "createdAt": "2025-11-03T11:15:00Z",
        "escalationLevel": 0
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 47,
      "itemsPerPage": 20
    },
    "summary": {
      "byStatus": {
        "pending": 47,
        "in_progress": 12,
        "approved": 234,
        "rejected": 8
      },
      "byPriority": {
        "critical": 5,
        "high": 15,
        "medium": 22,
        "low": 5
      }
    }
  }
}
```

---

### 5. Approve Transaction

Approve a transaction in review queue.

**Endpoint**: `POST /approve`

**Auth Required**: ✅ (admin, headAccountant, accountant)

**Request Body**:
```json
{
  "reviewId": "507f1f77bcf86cd799439020",
  "userId": "507f1f77bcf86cd799439012",
  "comments": "Verified with vendor. Contract attached. Approved for payment.",
  "approvalType": "single",
  "attachments": [
    "https://storage.example.com/docs/contract_12345.pdf"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "transactionId": "507f1f77bcf86cd799439021",
    "status": "approved",
    "reviewedBy": "507f1f77bcf86cd799439012",
    "reviewedAt": "2025-11-03T12:30:00Z",
    "reviewComments": "Verified with vendor. Contract attached. Approved for payment.",
    "reviewDuration": 7200000,
    "approvalType": "single",
    "auditTrail": [
      {
        "action": "created",
        "userId": "system",
        "timestamp": "2025-11-03T10:30:00Z"
      },
      {
        "action": "approved",
        "userId": "507f1f77bcf86cd799439012",
        "timestamp": "2025-11-03T12:30:00Z",
        "comments": "Verified with vendor. Contract attached. Approved for payment."
      }
    ]
  },
  "message": "✅ Transacción aprobada exitosamente. Se procederá con el pago."
}
```

---

### 6. Reject Transaction

Reject a transaction in review queue.

**Endpoint**: `POST /reject`

**Auth Required**: ✅ (admin, headAccountant, accountant)

**Request Body**:
```json
{
  "reviewId": "507f1f77bcf86cd799439020",
  "userId": "507f1f77bcf86cd799439012",
  "reason": "fraud_suspected",
  "comments": "Vendor cannot be verified. No response to calls. Suspicious email domain.",
  "notifySubmitter": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "transactionId": "507f1f77bcf86cd799439021",
    "status": "rejected",
    "reviewedBy": "507f1f77bcf86cd799439012",
    "reviewedAt": "2025-11-03T12:35:00Z",
    "rejectionReason": "fraud_suspected",
    "reviewComments": "Vendor cannot be verified. No response to calls. Suspicious email domain.",
    "reviewDuration": 7500000
  },
  "message": "❌ Transacción rechazada. El solicitante ha sido notificado."
}
```

---

### 7. Assign to Reviewer

Assign a review item to a specific user.

**Endpoint**: `POST /assign`

**Auth Required**: ✅ (admin, headAccountant)

**Request Body**:
```json
{
  "reviewId": "507f1f77bcf86cd799439020",
  "assignedTo": "507f1f77bcf86cd799439013",
  "assignedBy": "507f1f77bcf86cd799439012",
  "priority": "high",
  "notes": "Please review by end of day. High priority vendor payment."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "assignedTo": "507f1f77bcf86cd799439013",
    "assignedBy": "507f1f77bcf86cd799439012",
    "assignedAt": "2025-11-03T13:00:00Z",
    "status": "in_progress",
    "priority": "high"
  },
  "message": "✅ Revisión asignada exitosamente a María García"
}
```

---

### 8. Get Statistics

Get dual review system statistics.

**Endpoint**: `GET /statistics`

**Auth Required**: ✅ (admin, headAccountant, accountant)

**Query Parameters**:
```
organizationId: string (required)
branchId: string (optional)
startDate: string (optional) - ISO date
endDate: string (optional) - ISO date
```

**Example Request**:
```http
GET /api/ai-agent/dual-review/statistics?organizationId=507f1f77bcf86cd799439011&startDate=2025-10-01&endDate=2025-11-03
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-10-01T00:00:00Z",
      "endDate": "2025-11-03T23:59:59Z",
      "days": 34
    },
    "totals": {
      "totalReviews": 301,
      "approved": 234,
      "rejected": 8,
      "pending": 47,
      "inProgress": 12
    },
    "approvalRate": 96.69,
    "rejectionRate": 3.31,
    "averageReviewTime": 5400000,
    "autoProcessingEnabled": true,
    "autoProcessedCount": 1847,
    "humanReviewedCount": 301,
    "autoProcessingRate": 85.99,
    "byPriority": {
      "critical": {
        "count": 23,
        "avgReviewTime": 3600000,
        "approvalRate": 91.30
      },
      "high": {
        "count": 89,
        "avgReviewTime": 5100000,
        "approvalRate": 95.51
      },
      "medium": {
        "count": 145,
        "avgReviewTime": 6300000,
        "approvalRate": 97.93
      },
      "low": {
        "count": 44,
        "avgReviewTime": 7200000,
        "approvalRate": 100.00
      }
    },
    "byReviewer": [
      {
        "userId": "507f1f77bcf86cd799439012",
        "name": "Juan Pérez",
        "reviewedCount": 87,
        "approvedCount": 85,
        "rejectedCount": 2,
        "avgReviewTime": 4800000
      },
      {
        "userId": "507f1f77bcf86cd799439013",
        "name": "María García",
        "reviewedCount": 134,
        "approvedCount": 131,
        "rejectedCount": 3,
        "avgReviewTime": 5200000
      }
    ],
    "topRejectionReasons": [
      {
        "reason": "fraud_suspected",
        "count": 3,
        "percentage": 37.50
      },
      {
        "reason": "insufficient_documentation",
        "count": 2,
        "percentage": 25.00
      },
      {
        "reason": "policy_violation",
        "count": 2,
        "percentage": 25.00
      },
      {
        "reason": "duplicate_transaction",
        "count": 1,
        "percentage": 12.50
      }
    ]
  }
}
```

---

## ✅ Checklist Manager API

**Base Path**: `/api/ai-agent/checklist`

### 1. Get Available Checklists

List all available checklist types.

**Endpoint**: `GET /available`

**Auth Required**: ✅ (all authenticated users)

**Response**:
```json
{
  "success": true,
  "data": {
    "checklists": [
      {
        "type": "customerInvoice",
        "name": "Factura a Cliente",
        "description": "Lista de verificación completa para emitir facturas a clientes",
        "itemCount": 10,
        "estimatedTime": "3-5 min",
        "applicableTo": ["customer_invoice", "sales_invoice"],
        "categories": ["Sales", "Revenue"]
      },
      {
        "type": "vendorPayment",
        "name": "Pago a Proveedor",
        "description": "Verificación de pagos a proveedores",
        "itemCount": 10,
        "estimatedTime": "5-8 min",
        "applicableTo": ["vendor_payment", "supplier_payment"],
        "categories": ["Purchases", "Expenses"]
      },
      {
        "type": "expenseReimbursement",
        "name": "Reembolso de Gastos",
        "description": "Revisión de solicitudes de reembolso de gastos",
        "itemCount": 8,
        "estimatedTime": "4-6 min",
        "applicableTo": ["expense_reimbursement", "employee_expense"],
        "categories": ["Expenses", "HR"]
      },
      {
        "type": "bankReconciliation",
        "name": "Conciliación Bancaria",
        "description": "Proceso completo de conciliación de cuentas bancarias",
        "itemCount": 8,
        "estimatedTime": "15-30 min",
        "applicableTo": ["bank_reconciliation"],
        "categories": ["Treasury", "Cash Management"]
      },
      {
        "type": "monthlyClosing",
        "name": "Cierre Mensual",
        "description": "Lista de verificación para cierre contable mensual",
        "itemCount": 13,
        "estimatedTime": "2-4 hours",
        "applicableTo": ["monthly_close", "period_end"],
        "categories": ["Accounting", "Financial Close"]
      }
    ],
    "totalChecklists": 5
  }
}
```

---

### 2. Start Checklist

Start a checklist for a transaction.

**Endpoint**: `POST /start`

**Auth Required**: ✅ (accountant, headAccountant, admin)

**Request Body**:
```json
{
  "checklistType": "vendorPayment",
  "transactionId": "507f1f77bcf86cd799439030",
  "transactionType": "vendor_payment",
  "organizationId": "507f1f77bcf86cd799439011",
  "branchId": null,
  "startedBy": "507f1f77bcf86cd799439012"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439040",
    "checklistType": "vendorPayment",
    "checklistVersion": "1.0",
    "transactionId": "507f1f77bcf86cd799439030",
    "transactionType": "vendor_payment",
    "organizationId": "507f1f77bcf86cd799439011",
    "status": "in_progress",
    "completionPercentage": 0,
    "estimatedTime": "5-8 min",
    "items": [
      {
        "id": "vp_1",
        "check": "Proveedor validado en sistema",
        "category": "vendor_validation",
        "validationRules": [
          "Vendor must exist in system",
          "Vendor status must be 'active'",
          "Vendor must have valid RFC/Tax ID"
        ],
        "completed": false,
        "passed": null
      },
      {
        "id": "vp_2",
        "check": "Factura recibida y verificada",
        "category": "document_verification",
        "validationRules": [
          "Invoice document attached",
          "Invoice number matches",
          "Invoice date is valid"
        ],
        "completed": false,
        "passed": null
      }
      // ... 8 more items
    ],
    "startedBy": "507f1f77bcf86cd799439012",
    "startedAt": "2025-11-03T14:00:00Z"
  },
  "message": "✅ Checklist iniciado exitosamente"
}
```

---

### 3. AI Suggest Checklist

Get AI recommendation for appropriate checklist.

**Endpoint**: `POST /suggest`

**Auth Required**: ✅ (all authenticated users)

**Request Body**:
```json
{
  "transactionId": "507f1f77bcf86cd799439030",
  "transactionType": "vendor_payment",
  "transactionData": {
    "amount": 15000,
    "vendor": "Acme Corp",
    "description": "Office supplies purchase",
    "hasInvoice": true,
    "hasPurchaseOrder": true
  },
  "organizationId": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestedChecklist": "vendorPayment",
    "confidence": 0.95,
    "reasoning": "Esta transacción es un pago a proveedor con factura y orden de compra. El checklist 'vendorPayment' es el más apropiado para verificar: validación de proveedor, three-way match (PO-Invoice-Receipt), aprobaciones, y cálculos de impuestos.",
    "alternativeChecklists": [
      {
        "type": "expenseReimbursement",
        "confidence": 0.35,
        "reason": "Podría aplicar si es un reembolso en lugar de pago directo"
      }
    ]
  }
}
```

---

### 4. Get Checklist Details

Get full details of a checklist execution.

**Endpoint**: `GET /:id`

**Auth Required**: ✅ (all authenticated users)

**Response**: (Same as Start Checklist response, but with updated completion status)

---

### 5. Mark Item Complete

Mark a checklist item as complete.

**Endpoint**: `PUT /:id/check-item`

**Auth Required**: ✅ (accountant, headAccountant, admin)

**Request Body**:
```json
{
  "itemId": "vp_1",
  "completed": true,
  "passed": true,
  "checkedBy": "507f1f77bcf86cd799439012",
  "notes": "Vendor verified in system. RFC: ABC123456XXX. Status: Active.",
  "attachments": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439040",
    "checklistType": "vendorPayment",
    "completionPercentage": 10,
    "items": [
      {
        "id": "vp_1",
        "check": "Proveedor validado en sistema",
        "completed": true,
        "passed": true,
        "checkedAt": "2025-11-03T14:05:00Z",
        "checkedBy": "507f1f77bcf86cd799439012",
        "notes": "Vendor verified in system. RFC: ABC123456XXX. Status: Active."
      }
      // ... other items
    ]
  },
  "message": "✅ Item marcado como completado (1/10)"
}
```

---

### 6. AI Validate Item

Request AI validation for a checklist item.

**Endpoint**: `POST /:id/validate-item`

**Auth Required**: ✅ (all authenticated users)

**Request Body**:
```json
{
  "itemId": "vp_3",
  "transactionData": {
    "purchaseOrder": {
      "number": "PO-2025-1234",
      "amount": 15000,
      "items": [
        { "description": "Office chairs", "quantity": 50, "unitPrice": 300 }
      ]
    },
    "invoice": {
      "number": "INV-9876",
      "amount": 15000,
      "items": [
        { "description": "Office chairs", "quantity": 50, "unitPrice": 300 }
      ]
    },
    "receipt": {
      "number": "RCV-5432",
      "quantity": 50,
      "date": "2025-11-01"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "itemId": "vp_3",
    "validation": {
      "passed": true,
      "message": "✅ Three-way match completado exitosamente",
      "issues": [],
      "suggestions": [
        "Consider adding photos of received goods for high-value purchases"
      ],
      "confidence": 0.98,
      "details": {
        "poMatch": true,
        "invoiceMatch": true,
        "receiptMatch": true,
        "amountMatch": true,
        "quantityMatch": true,
        "descriptionMatch": true
      }
    }
  }
}
```

---

### 7. Complete Checklist

Mark entire checklist as complete.

**Endpoint**: `POST /:id/complete`

**Auth Required**: ✅ (accountant, headAccountant, admin)

**Request Body**:
```json
{
  "completedBy": "507f1f77bcf86cd799439012",
  "finalNotes": "All items verified. Transaction approved for payment.",
  "overallResult": "passed"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439040",
    "status": "completed",
    "completionPercentage": 100,
    "completedBy": "507f1f77bcf86cd799439012",
    "completedAt": "2025-11-03T14:35:00Z",
    "actualTime": 2100000,
    "estimatedTime": "5-8 min",
    "finalNotes": "All items verified. Transaction approved for payment.",
    "overallResult": "passed",
    "passedItems": 10,
    "failedItems": 0
  },
  "message": "✅ Checklist completado exitosamente. Tiempo: 35 minutos."
}
```

---

### 8. Get History

Get checklist history for a transaction.

**Endpoint**: `GET /history/:transactionId`

**Auth Required**: ✅ (all authenticated users)

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionId": "507f1f77bcf86cd799439030",
    "checklists": [
      {
        "_id": "507f1f77bcf86cd799439040",
        "checklistType": "vendorPayment",
        "status": "completed",
        "completionPercentage": 100,
        "startedAt": "2025-11-03T14:00:00Z",
        "completedAt": "2025-11-03T14:35:00Z",
        "startedBy": "507f1f77bcf86cd799439012",
        "completedBy": "507f1f77bcf86cd799439012",
        "overallResult": "passed"
      }
    ],
    "totalChecklists": 1
  }
}
```

---

### 9. Get Statistics

Get checklist usage statistics.

**Endpoint**: `GET /statistics`

**Auth Required**: ✅ (admin, headAccountant)

**Query Parameters**:
```
organizationId: string (required)
startDate: string (optional)
endDate: string (optional)
```

**Response**:
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-10-01T00:00:00Z",
      "endDate": "2025-11-03T23:59:59Z"
    },
    "totalChecklists": 487,
    "completedChecklists": 465,
    "inProgressChecklists": 18,
    "incompleteChecklists": 4,
    "completionRate": 95.48,
    "averageTimeByType": {
      "customerInvoice": 240000,
      "vendorPayment": 420000,
      "expenseReimbursement": 300000,
      "bankReconciliation": 1800000,
      "monthlyClosing": 10800000
    },
    "byChecklistType": {
      "customerInvoice": 187,
      "vendorPayment": 215,
      "expenseReimbursement": 62,
      "bankReconciliation": 18,
      "monthlyClosing": 5
    },
    "mostFailedItems": [
      {
        "itemId": "vp_3",
        "check": "Three-way match completado",
        "failureRate": 8.2,
        "totalChecks": 215,
        "failures": 18
      }
    ]
  }
}
```

---

### 10. Rollback Completion

Rollback a completed checklist (admin only).

**Endpoint**: `PUT /:id/rollback`

**Auth Required**: ✅ (admin, headAccountant)

**Request Body**:
```json
{
  "reason": "Error found in verification. Need to re-check three-way match.",
  "userId": "507f1f77bcf86cd799439012"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439040",
    "status": "in_progress",
    "completionPercentage": 90,
    "rollbackReason": "Error found in verification. Need to re-check three-way match.",
    "rollbackBy": "507f1f77bcf86cd799439012",
    "rollbackAt": "2025-11-03T15:00:00Z"
  },
  "message": "⚠️ Checklist revertido a estado 'en progreso'"
}
```

---

## 💰 ROI Calculator API

**Base Path**: `/api/ai-agent/roi`

### 1. Calculate with Custom Config

Calculate ROI with custom configuration.

**Endpoint**: `POST /calculate`

**Auth Required**: ✅ (admin, headAccountant)

**Request Body**:
```json
{
  "organizationId": "507f1f77bcf86cd799439011",
  "paybackPeriodYears": 4,
  "oneTimeCosts": {
    "implementation": 150000,
    "training": 25000,
    "dataMigration": 30000,
    "infrastructure": 20000,
    "consulting": 15000,
    "other": 0
  },
  "monthlyCosts": {
    "aiLicense": 2000,
    "erpIntegration": 1500,
    "maintenance": 1000,
    "support": 800,
    "cloudHosting": 500,
    "securityCompliance": 700,
    "other": 0
  },
  "monthlySavings": {
    "laborReduction": 15000,
    "errorReduction": 5000,
    "fasterClosing": 3000,
    "complianceAutomation": 2500,
    "auditEfficiency": 2000,
    "cashFlowOptimization": 4500,
    "other": 0
  },
  "adjustmentFactors": {
    "inflationRate": 0.03,
    "discountRate": 0.08,
    "riskAdjustment": 0.15,
    "adoptionCurve": [0.5, 0.7, 0.9, 1.0]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalInvestment": 240000,
      "totalMonthlyCosts": 6500,
      "totalMonthlySavings": 32000,
      "monthlyNetBenefit": 25500,
      "annualNetBenefit": 306000,
      "npv": 832145.67,
      "irr": 127.45,
      "roi": 346.73,
      "paybackPeriod": 0.78,
      "breakEvenMonth": 10
    },
    "yearByYearProjection": [
      {
        "year": 1,
        "adoptionRate": 50,
        "grossSavings": 192000,
        "operatingCosts": 78000,
        "netBenefit": 114000,
        "cumulativeNetBenefit": -126000,
        "npv": -122222.22
      },
      {
        "year": 2,
        "adoptionRate": 70,
        "grossSavings": 268800,
        "operatingCosts": 80340,
        "netBenefit": 188460,
        "cumulativeNetBenefit": 62460,
        "npv": 52027.78
      },
      {
        "year": 3,
        "adoptionRate": 90,
        "grossSavings": 345600,
        "operatingCosts": 82750,
        "netBenefit": 262850,
        "cumulativeNetBenefit": 325310,
        "npv": 283518.52
      },
      {
        "year": 4,
        "adoptionRate": 100,
        "grossSavings": 384000,
        "operatingCosts": 85233,
        "netBenefit": 298767,
        "cumulativeNetBenefit": 624077,
        "npv": 620822.59
      }
    ],
    "insights": [
      "🎯 ROI excepcional de 346.73% en 4 años",
      "💰 NPV positivo de $832,145.67 indica proyecto altamente rentable",
      "⚡ Recuperación de inversión en menos de 10 meses",
      "📈 IRR de 127.45% muy superior a tasa de descuento (8%)",
      "✅ Recomendación: Proceder con implementación inmediata"
    ]
  }
}
```

---

### 2. Calculate with Default Config

Calculate ROI using 4-year default configuration.

**Endpoint**: `POST /calculate-default`

**Auth Required**: ✅ (admin, headAccountant)

**Request Body**:
```json
{
  "organizationId": "507f1f77bcf86cd799439011"
}
```

**Response**: (Same format as custom calculation)

---

### 3. Sensitivity Analysis

Run 4 scenario analysis (optimistic, baseline, conservative, pessimistic).

**Endpoint**: `POST /sensitivity-analysis`

**Auth Required**: ✅ (admin, headAccountant)

**Request Body**:
```json
{
  "organizationId": "507f1f77bcf86cd799439011",
  "baseConfig": {
    "paybackPeriodYears": 4,
    "oneTimeCosts": { /* ... */ },
    "monthlyCosts": { /* ... */ },
    "monthlySavings": { /* ... */ }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "scenarios": {
      "optimistic": {
        "name": "Optimista (+20% ahorros, -10% costos)",
        "assumptions": {
          "savingsMultiplier": 1.2,
          "costsMultiplier": 0.9
        },
        "results": {
          "npv": 1145678.90,
          "irr": 165.32,
          "roi": 477.37,
          "paybackPeriod": 0.65,
          "breakEvenMonth": 8
        }
      },
      "baseline": {
        "name": "Base (valores configurados)",
        "assumptions": {
          "savingsMultiplier": 1.0,
          "costsMultiplier": 1.0
        },
        "results": {
          "npv": 832145.67,
          "irr": 127.45,
          "roi": 346.73,
          "paybackPeriod": 0.78,
          "breakEvenMonth": 10
        }
      },
      "conservative": {
        "name": "Conservador (-20% ahorros, +10% costos)",
        "assumptions": {
          "savingsMultiplier": 0.8,
          "costsMultiplier": 1.1
        },
        "results": {
          "npv": 456789.12,
          "irr": 78.23,
          "roi": 190.33,
          "paybackPeriod": 1.05,
          "breakEvenMonth": 13
        }
      },
      "pessimistic": {
        "name": "Pesimista (-40% ahorros, +20% costos)",
        "assumptions": {
          "savingsMultiplier": 0.6,
          "costsMultiplier": 1.2
        },
        "results": {
          "npv": 123456.78,
          "irr": 35.12,
          "roi": 51.44,
          "paybackPeriod": 1.95,
          "breakEvenMonth": 24
        }
      }
    },
    "comparison": {
      "best": "optimistic",
      "worst": "pessimistic",
      "npvRange": {
        "min": 123456.78,
        "max": 1145678.90,
        "spread": 1022222.12
      },
      "roiRange": {
        "min": 51.44,
        "max": 477.37,
        "spread": 425.93
      }
    },
    "insights": [
      "✅ Proyecto es rentable en TODOS los escenarios",
      "📊 NPV positivo incluso en escenario pesimista",
      "⚡ Incluso con -40% ahorros y +20% costos, ROI sigue siendo 51.44%",
      "🎯 Recomendación: Implementar con alta confianza"
    ]
  }
}
```

---

### 4. Save Configuration

Save ROI configuration for later use.

**Endpoint**: `POST /configuration`

**Auth Required**: ✅ (admin, headAccountant)

**Request Body**:
```json
{
  "organizationId": "507f1f77bcf86cd799439011",
  "name": "Standard 4-Year ROI",
  "description": "Default configuration for 4-year payback period",
  "paybackPeriodYears": 4,
  "oneTimeCosts": { /* ... */ },
  "monthlyCosts": { /* ... */ },
  "monthlySavings": { /* ... */ },
  "adjustmentFactors": { /* ... */ },
  "calculatedMetrics": {
    "npv": 832145.67,
    "irr": 127.45,
    "roi": 346.73,
    "paybackPeriod": 0.78,
    "breakEvenMonth": 10
  },
  "isActive": true,
  "createdBy": "507f1f77bcf86cd799439012"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439050",
    "organizationId": "507f1f77bcf86cd799439011",
    "name": "Standard 4-Year ROI",
    "description": "Default configuration for 4-year payback period",
    "isActive": true,
    "createdBy": "507f1f77bcf86cd799439012",
    "createdAt": "2025-11-03T16:00:00Z"
  },
  "message": "✅ Configuración guardada exitosamente"
}
```

---

### 5-11. Additional ROI Endpoints

See full API documentation for:
- `GET /configuration/active/:id` - Get active configuration
- `PUT /configuration/:id` - Update configuration
- `DELETE /configuration/:id` - Delete configuration
- `GET /configuration/history/:orgId` - Get configuration history
- `POST /compare` - Compare two configurations
- `GET /templates` - Get preset templates
- `GET /export-config/:id` - Export as JSON

---

## 🚧 APIs To Be Implemented

The following APIs have backend services complete but need route files created:

### AI Agent Core API (TO BE IMPLEMENTED)
**Base Path**: `/api/ai-agent/core`
**Estimated Endpoints**: 8-10
**Status**: ❌ Routes not created yet

### Fraud Detection API (TO BE IMPLEMENTED)
**Base Path**: `/api/ai-agent/fraud-detection`
**Estimated Endpoints**: 7-9
**Status**: ❌ Routes not created yet

### USA Compliance API (TO BE IMPLEMENTED)
**Base Path**: `/api/ai-agent/compliance/usa`
**Estimated Endpoints**: 8-10
**Status**: ❌ Routes not created yet

### Mexico Compliance API (TO BE IMPLEMENTED)
**Base Path**: `/api/ai-agent/compliance/mexico`
**Estimated Endpoints**: 10-12
**Status**: ❌ Routes not created yet

### Reporting Engine API (TO BE IMPLEMENTED)
**Base Path**: `/api/ai-agent/reports`
**Estimated Endpoints**: 10-12
**Status**: ❌ Routes not created yet

### Predictive Analytics API (TO BE IMPLEMENTED)
**Base Path**: `/api/ai-agent/predictive`
**Estimated Endpoints**: 8-10
**Status**: ❌ Routes not created yet

---

## ⚠️ Error Handling

All API endpoints return consistent error responses:

### Error Response Format

```json
{
  "success": false,
  "error": "Error message in user-friendly language",
  "errorCode": "ERROR_CODE",
  "details": {
    "field": "fieldName",
    "value": "providedValue",
    "constraint": "validation constraint"
  },
  "timestamp": "2025-11-03T10:30:00Z",
  "path": "/api/ai-agent/dual-review/config",
  "requestId": "req_1234567890"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | No authentication token provided |
| `INVALID_TOKEN` | 401 | Authentication token is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `MISSING_REQUIRED_FIELD` | 400 | Required field is missing |
| `INVALID_FIELD_VALUE` | 400 | Field value doesn't meet constraints |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `OPERATION_FAILED` | 500 | Operation failed on server |
| `AI_SERVICE_ERROR` | 503 | AI service (OpenAI/Claude) unavailable |
| `DATABASE_ERROR` | 500 | Database operation failed |

### Example Error Responses

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "No se proporcionó token de autenticación",
  "errorCode": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-03T10:30:00Z"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "error": "Permisos insuficientes. Se requiere rol 'admin' o 'headAccountant'",
  "errorCode": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "requiredRoles": ["admin", "headAccountant"],
    "userRole": "accountant"
  },
  "timestamp": "2025-11-03T10:30:00Z"
}
```

**400 Validation Error**:
```json
{
  "success": false,
  "error": "Error de validación",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "field": "amount",
    "value": -1000,
    "constraint": "El monto debe ser mayor a 0"
  },
  "timestamp": "2025-11-03T10:30:00Z"
}
```

**503 Service Unavailable**:
```json
{
  "success": false,
  "error": "Servicio de IA temporalmente no disponible. Reintente en unos momentos.",
  "errorCode": "AI_SERVICE_ERROR",
  "details": {
    "service": "OpenAI GPT-4",
    "fallbackAttempted": true,
    "fallbackService": "Anthropic Claude",
    "fallbackStatus": "also_failed"
  },
  "timestamp": "2025-11-03T10:30:00Z"
}
```

---

## 🚦 Rate Limiting

API endpoints are rate limited to prevent abuse:

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699012800
```

### Rate Limit Tiers

| User Role | Requests per Minute | Requests per Hour |
|-----------|---------------------|-------------------|
| admin | 200 | 10,000 |
| headAccountant | 150 | 7,500 |
| accountant | 100 | 5,000 |
| assistant | 50 | 2,500 |

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Límite de solicitudes excedido. Intente nuevamente en 45 segundos.",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "resetAt": "2025-11-03T10:45:00Z",
    "retryAfter": 45
  },
  "timestamp": "2025-11-03T10:44:15Z"
}
```

---

## 📝 Notes

1. **All timestamps** are in ISO 8601 format (UTC)
2. **All amounts** are in smallest currency unit (e.g., cents for USD)
3. **All IDs** are MongoDB ObjectIDs (24-character hex string)
4. **Pagination** uses cursor-based pagination for large datasets
5. **Filtering** supports MongoDB query syntax
6. **Sorting** supports multiple fields with asc/desc order

---

## 🔗 Related Documentation

- [Backend Services Review](./AI_ACCOUNTING_AGENT_REVIEW.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [User Manual](./USER_MANUAL.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-03  
**Status**: ✅ Complete for implemented endpoints | ⚠️ Pending for 6 services
