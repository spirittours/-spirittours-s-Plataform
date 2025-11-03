# 📖 AI Accounting Agent - User Manual

**Version**: 1.0  
**Last Updated**: 2025-11-03  
**For Users**: Administrators, Head Accountants, Accountants, Assistants

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Dual Review System](#dual-review-system)
4. [Checklist Manager](#checklist-manager)
5. [ROI Calculator](#roi-calculator)
6. [Fraud Detection](#fraud-detection)
7. [Compliance Management](#compliance-management)
8. [Reports & Analytics](#reports--analytics)
9. [Predictive Analytics](#predictive-analytics)
10. [User Roles & Permissions](#user-roles--permissions)
11. [FAQ](#faq)

---

## 🚀 Getting Started

### First Time Login

1. Navigate to https://yourdomain.com
2. Enter your email and password
3. Complete 2FA if enabled
4. You'll be redirected to the dashboard

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  AI Accounting Agent                       [User] [Settings]│
├─────────────────────────────────────────────────────────────┤
│  📊 Dashboard  │  🔄 Reviews  │  ✅ Checklists  │  💰 ROI  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚡ Quick Stats                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Pending   │ │Auto      │ │Fraud     │ │Approval  │      │
│  │Reviews   │ │Processing│ │Alerts    │ │Rate      │      │
│  │    47    │ │  ✅ ON   │ │    5     │ │  96.7%   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                              │
│  📈 Recent Activity                                         │
│  • Transaction #12345 approved by Juan Pérez              │
│  • Fraud alert for vendor payment $45,000                 │
│  • Checklist completed for invoice #INV-9876              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Dual Review System

### Overview

The **Dual Review System** is the **#1 most important feature** that gives administrators control over AI automatic processing.

### Key Concept

- **Toggle ON** = AI processes transactions automatically (subject to thresholds)
- **Toggle OFF** = All transactions require human review

### For Administrators

#### 1. Accessing Settings

1. Navigate to **Settings** → **Dual Review**
2. You'll see the configuration dashboard

#### 2. Toggle Auto-Processing

**To DISABLE automatic processing**:
1. Click the toggle switch to **OFF**
2. Confirm action
3. ✅ All new transactions will now require human review

**To ENABLE automatic processing**:
1. Click the toggle switch to **ON**
2. Configure thresholds (optional)
3. ✅ Transactions within thresholds will process automatically

#### 3. Configure Thresholds

**Amount Threshold** (Default: $10,000):
- Transactions above this amount require review
- Recommended: Set based on your risk tolerance
- Example: $10,000 for small business, $100,000 for enterprise

**Risk Score Threshold** (Default: 70/100):
- Transactions with risk score above this require review
- Lower = more reviews, Higher = fewer reviews
- Recommended: 60-80 for balanced approach

**Fraud Confidence Threshold** (Default: 80%):
- Transactions with fraud confidence above this require review
- Recommended: Keep at 80% or higher

#### 4. Role-Based Rules

Configure automatic approval limits by role:

| Role | Max Auto-Approve Amount | Can Bypass Review |
|------|------------------------|-------------------|
| Admin | $100,000 | ✅ Yes |
| Head Accountant | $50,000 | ❌ No |
| Accountant | $10,000 | ❌ No |
| Assistant | $0 | ❌ No |

### For Reviewers (Accountants)

#### 1. View Review Queue

1. Navigate to **Reviews** → **Queue**
2. You'll see all pending transactions

**Priority Levels**:
- 🔴 **Critical**: Potential fraud, high risk
- 🟠 **High**: Large amounts, new vendors
- 🟡 **Medium**: Standard threshold exceedances
- 🟢 **Low**: Routine reviews

#### 2. Review a Transaction

1. Click on transaction to open details
2. Review AI analysis:
   - Risk score
   - Fraud confidence
   - Concerns identified
   - Supporting documents
3. Make decision: **Approve** or **Reject**

**To Approve**:
1. Click **Approve** button
2. Add comments (optional but recommended)
3. Attach additional documents if needed
4. Click **Submit**

**To Reject**:
1. Click **Reject** button
2. **Required**: Select rejection reason
3. **Required**: Add detailed comments
4. Check "Notify submitter" if applicable
5. Click **Submit**

#### 3. Understanding AI Analysis

**AI Recommendation**:
- ✅ **Approve**: Low risk, all checks passed
- ⚠️ **Review Required**: Some concerns identified
- ❌ **Reject**: High risk, fraud suspected

**Concerns Example**:
```
⚠️ Concerns Identified:
• New vendor with no transaction history
• Amount exceeds threshold ($45,000 > $10,000)
• Wire transfer to foreign bank account
• Vendor address is P.O. Box

AI Confidence: 92%
Recommendation: Manual review required
```

### Best Practices

✅ **DO**:
- Review AI analysis carefully
- Add detailed comments for rejection
- Escalate high-risk transactions
- Check supporting documents
- Verify vendor information

❌ **DON'T**:
- Ignore AI warnings
- Approve without reviewing details
- Skip adding comments
- Process transactions outside your approval limit

---

## ✅ Checklist Manager

### Overview

5 predefined accounting checklists with AI validation to ensure nothing is missed.

### Available Checklists

1. **Customer Invoice** (10 items, 3-5 min)
2. **Vendor Payment** (10 items, 5-8 min)
3. **Expense Reimbursement** (8 items, 4-6 min)
4. **Bank Reconciliation** (8 items, 15-30 min)
5. **Monthly Closing** (13 items, 2-4 hours)

### How to Use

#### 1. Start a Checklist

**Option A: Manual Selection**
1. Open transaction
2. Click **Start Checklist**
3. Select checklist type
4. Click **Begin**

**Option B: AI Suggestion**
1. Open transaction
2. Click **Suggest Checklist**
3. AI will recommend appropriate checklist
4. Review suggestion and click **Use This**

#### 2. Complete Checklist Items

For each item:
1. Review the requirement
2. Perform the check
3. Mark as **Complete** ✅ or **Failed** ❌
4. Add notes (optional)
5. Attach documents if required

**Example - Vendor Payment Checklist**:
```
Item 1: ✅ Vendor validated in system
  ✅ Completed by: Juan Pérez
  📝 Notes: Vendor verified. RFC: ABC123456XXX. Status: Active.

Item 2: ✅ Invoice received and verified
  ✅ Completed by: Juan Pérez
  📎 Attached: invoice_12345.pdf

Item 3: ⏳ Three-way match completed (PO-Invoice-Receipt)
  ⏳ In Progress
  🤖 Click "AI Validate" for automatic check
```

#### 3. AI Validation

For complex checks, use AI validation:
1. Click **AI Validate** button
2. AI analyzes transaction data
3. Results appear instantly:
   - ✅ Passed: All checks successful
   - ⚠️ Warning: Minor issues found
   - ❌ Failed: Critical issues detected

**AI Validation Example**:
```
🤖 AI Validation Result

✅ Three-Way Match: PASSED

Details:
• PO #PO-2025-1234: $15,000
• Invoice #INV-9876: $15,000
• Receipt #RCV-5432: 50 units

Amounts Match: ✅
Quantities Match: ✅
Descriptions Match: ✅

Confidence: 98%

💡 Suggestion: Consider adding photos of received goods
```

#### 4. Complete Checklist

When all items are done:
1. Review completion (should be 100%)
2. Click **Complete Checklist**
3. Add final notes
4. Submit

### Checklist History

View completed checklists:
1. Open transaction
2. Click **Checklist History**
3. See all previous checklists with:
   - Who completed
   - When completed
   - Results (passed/failed)
   - Time taken

---

## 💰 ROI Calculator

### Overview

Calculate the ROI of implementing the AI Accounting Agent system with configurable 4-year analysis.

### Using the Calculator

#### 1. Quick Calculation (Default Settings)

1. Navigate to **ROI Calculator**
2. Click **Calculate with Defaults**
3. View results instantly

**Default Configuration**:
- Payback Period: 4 years
- Implementation Cost: $240,000
- Monthly Costs: $6,500
- Monthly Savings: $32,000
- Expected ROI: ~347%

#### 2. Custom Calculation

**Step 1: One-Time Costs**
```
Implementation: $______
Training: $______
Data Migration: $______
Infrastructure: $______
Consulting: $______
Other: $______
───────────────────────
Total: $______
```

**Step 2: Monthly Costs**
```
AI License: $______
ERP Integration: $______
Maintenance: $______
Support: $______
Cloud Hosting: $______
Security/Compliance: $______
───────────────────────
Monthly Total: $______
```

**Step 3: Monthly Savings**
```
Labor Reduction: $______
Error Reduction: $______
Faster Closing: $______
Compliance Automation: $______
Audit Efficiency: $______
Cash Flow Optimization: $______
───────────────────────
Monthly Total: $______
```

**Step 4: Adjustment Factors**
```
Inflation Rate: ___% (default: 3%)
Discount Rate: ___% (default: 8%)
Risk Adjustment: ___% (default: 15%)
Adoption Curve: Year 1: ___%, Year 2: ___%, Year 3: ___%, Year 4: ___%
```

**Step 5: Calculate**
1. Click **Calculate ROI**
2. View comprehensive results

#### 3. Understanding Results

**Summary Metrics**:
- **NPV (Net Present Value)**: Total value in today's dollars
  - Positive = Good investment
  - Higher = Better
- **IRR (Internal Rate of Return)**: Effective interest rate
  - Higher than discount rate = Good investment
- **ROI %**: Return on investment percentage
  - Above 100% = Profitable
- **Payback Period**: Time to recover investment
  - Shorter = Better
  - Under 2 years = Excellent

**Example Results**:
```
📊 ROI Analysis Results

💰 Summary:
Total Investment: $240,000
Monthly Net Benefit: $25,500
Annual Net Benefit: $306,000

🎯 Key Metrics:
NPV: $832,145.67 ✅
IRR: 127.45% ✅
ROI: 346.73% ✅
Payback Period: 9.4 months ⚡

📈 Year-by-Year Projection:

Year 1 (50% adoption):
  Savings: $192,000
  Costs: $78,000
  Net: $114,000
  Cumulative: -$126,000

Year 2 (70% adoption):
  Savings: $268,800
  Costs: $80,340
  Net: $188,460
  Cumulative: $62,460 ✅ (BREAKEVEN)

Year 3 (90% adoption):
  Savings: $345,600
  Costs: $82,750
  Net: $262,850
  Cumulative: $325,310

Year 4 (100% adoption):
  Savings: $384,000
  Costs: $85,233
  Net: $298,767
  Cumulative: $624,077

💡 Insights:
✅ Exceptional ROI of 346.73% over 4 years
✅ Break-even achieved in Year 2
✅ IRR of 127.45% far exceeds discount rate (8%)
⚡ Payback in under 10 months
🎯 Recommendation: Proceed with implementation
```

#### 4. Sensitivity Analysis

Test different scenarios:
1. Click **Sensitivity Analysis**
2. View 4 scenarios:
   - **Optimistic**: +20% savings, -10% costs
   - **Baseline**: Your configuration
   - **Conservative**: -20% savings, +10% costs
   - **Pessimistic**: -40% savings, +20% costs

**Use Cases**:
- Present to management (show all scenarios)
- Risk assessment (check pessimistic scenario)
- Best/worst case planning

#### 5. Save Configuration

1. Click **Save Configuration**
2. Enter name: "Q4 2025 ROI Analysis"
3. Add description (optional)
4. Click **Save**
5. Access later from **Saved Configurations**

---

## 🚨 Fraud Detection

### Overview

4-layer fraud detection system with 30 fraud patterns and ML-based scoring.

### Understanding Fraud Alerts

#### Alert Priority Levels

🔴 **Critical** (Fraud Confidence 81-100%):
- Immediate action required
- Likely fraud detected
- Block transaction automatically

🟠 **High** (Fraud Confidence 61-80%):
- Review urgently
- Strong indicators present
- Consider blocking

🟡 **Medium** (Fraud Confidence 31-60%):
- Review when possible
- Some red flags
- Monitor closely

🟢 **Low** (Fraud Confidence 0-30%):
- Informational only
- Minor anomalies
- Normal processing OK

### Common Fraud Patterns Detected

**Transaction Patterns**:
- ⚠️ Round numbers ($9,000.00, $5,000.00)
- ⚠️ Just-below-threshold amounts
- ⚠️ Rapid succession of similar transactions
- ⚠️ Weekend/holiday transactions
- ⚠️ Amount splitting pattern

**Vendor Patterns**:
- 🚫 New vendor with large first transaction
- 🚫 Similar vendor names (typosquatting)
- 🚫 P.O. Box addresses
- 🚫 Frequent vendor account changes
- 🚫 Shell company indicators

**User Behavior**:
- 🔴 Access from unusual locations
- 🔴 Multiple failed login attempts
- 🔴 Transactions outside normal hours
- 🔴 Permission escalation attempts

**Document Anomalies**:
- 📄 Missing required documents
- 📄 Modified PDF metadata
- 📄 Duplicate document hashes
- 📄 Altered accounting codes

### Responding to Fraud Alerts

#### 1. Review the Alert

```
🔴 CRITICAL FRAUD ALERT

Transaction: #TX-456789
Amount: $45,000
Vendor: "Acme Supplies LLC"
Date: 2025-11-03 02:45 AM

🚨 Red Flags Detected:
1. New vendor (no transaction history)
2. Large first transaction ($45,000)
3. Transaction at unusual hour (2:45 AM)
4. Wire transfer to foreign account
5. Vendor address is P.O. Box
6. Email domain recently registered

Fraud Confidence: 92% 🔴
Risk Score: 88/100
AI Recommendation: REJECT & INVESTIGATE

Pattern Match:
• New vendor fraud pattern (confidence: 95%)
• Shell company indicators (confidence: 87%)
• Time-based anomaly (confidence: 78%)
```

#### 2. Investigate

**Verify Vendor**:
- [ ] Call vendor at phone number on file
- [ ] Verify address (not P.O. Box)
- [ ] Check business registration
- [ ] Verify contact person exists
- [ ] Review contract/agreement

**Check Documentation**:
- [ ] Review invoice details
- [ ] Verify purchase order exists
- [ ] Check goods/services received
- [ ] Validate approval chain
- [ ] Examine supporting documents

**Contact Submitter**:
- [ ] Ask for additional information
- [ ] Verify purchase necessity
- [ ] Confirm vendor relationship
- [ ] Request additional documentation

#### 3. Take Action

**If Legitimate**:
1. Add notes to transaction
2. Mark fraud alert as **False Positive**
3. System learns from your feedback
4. Approve transaction

**If Fraudulent**:
1. Mark fraud alert as **Confirmed Fraud**
2. Reject transaction immediately
3. Notify security team
4. Block vendor
5. Report to authorities if needed

#### 4. Provide Feedback

Fraud detection improves with your feedback:

```
Fraud Alert Feedback Form:

Alert ID: #FA-789012
Transaction: #TX-456789

1. Was this fraud? [Yes / No]
2. Which patterns were correct?
   ☑️ New vendor pattern
   ☑️ Unusual hour
   ☐ P.O. Box address (vendor has physical office)
3. Severity accurate? [Yes / No]
4. Additional notes: "Vendor verified. Office visit confirmed. Legitimate business."

Submit Feedback
```

### Fraud Prevention Tips

✅ **DO**:
- Review all critical alerts immediately
- Verify new vendors before large payments
- Check transaction timing patterns
- Validate wire transfers
- Keep vendor contact information updated
- Report suspicious activity
- Provide feedback on alerts

❌ **DON'T**:
- Ignore fraud alerts
- Rush through reviews
- Approve without verification
- Share vendor credentials
- Process urgent requests without validation

---

## 🏛️ Compliance Management

### USA Compliance

#### Sales Tax Calculation

**Automatic** for all 50 states:
1. Transaction amount detected
2. Customer state identified
3. Correct tax rate applied (0% to 9.55%)
4. Tax calculated and added

**View Tax Details**:
```
Transaction: $1,000.00
Customer State: California
Sales Tax Rate: 7.25%
Sales Tax Amount: $72.50
Total: $1,072.50
```

#### Form 1099 Generation

**Automatic Year-End**:
1. System scans all vendor payments
2. Identifies payments >$600
3. Generates 1099-NEC or 1099-MISC
4. Ready for IRS submission by Jan 31

**Manual Generation**:
1. Navigate to **Compliance** → **USA** → **1099 Forms**
2. Select tax year
3. Click **Generate 1099s**
4. Review and download forms
5. File with IRS

#### Corporate Tax Estimation

View federal and state tax estimates:
1. Navigate to **Compliance** → **USA** → **Tax Estimates**
2. View breakdown:
   - Federal Tax (21%)
   - State Tax (varies 0-11.5%)
   - Total Tax Liability
3. Download tax report

### Mexico Compliance

#### RFC Validation

**Automatic**:
- All RFC entries validated in real-time
- Format checked (12 or 13 characters)
- Checksum verified
- SAT blacklist checked (optional)

**Manual Check**:
1. Navigate to **Compliance** → **Mexico** → **RFC Validator**
2. Enter RFC: `ABC123456XXX`
3. Click **Validate**
4. View results:
   - ✅ Valid
   - Type: Persona Moral
   - Format: Correct
   - Blacklist: Not listed

#### CFDI 4.0 Invoice Generation

**Create CFDI**:
1. Create invoice normally
2. System adds required CFDI fields:
   - RFC Emisor
   - RFC Receptor
   - Uso de CFDI (G01, G02, etc.)
   - Régimen Fiscal (601, 612, etc.)
   - Método de Pago (PUE/PPD)
   - Forma de Pago (01-31, 99)
3. IVA calculated automatically (16%)
4. XML generated
5. Sent to PAC for stamping (timbrado)
6. UUID received
7. PDF + XML ready to send

**CFDI Fields Example**:
```
📄 CFDI 4.0 - Factura

Emisor:
  RFC: ABC123456XXX
  Nombre: Mi Empresa SA de CV
  Régimen Fiscal: 601 - General de Ley PM

Receptor:
  RFC: VECJ880326XXX
  Nombre: Juan Pérez
  Uso CFDI: G03 - Gastos en general

Conceptos:
  1. Laptop Dell XPS 15
     Cantidad: 1
     Precio Unitario: $25,000.00
     Subtotal: $25,000.00

Subtotal: $25,000.00
IVA (16%): $4,000.00
Total: $29,000.00

Método de Pago: PUE (Pago en una sola exhibición)
Forma de Pago: 03 (Transferencia electrónica)

UUID: 12345678-ABCD-1234-ABCD-123456789ABC
Fecha Timbrado: 2025-11-03 10:30:00
```

#### Contabilidad Electrónica

**Monthly Submission**:
1. System generates automatically:
   - Catálogo de Cuentas (XML)
   - Balanza de Comprobación (XML)
   - Pólizas (XML)
2. Review before submission
3. Submit to SAT by day 3 of following month

**Access Reports**:
1. Navigate to **Compliance** → **Mexico** → **Contabilidad Electrónica**
2. Select month
3. Download XML files
4. Submit to SAT portal

---

## 📊 Reports & Analytics

### Daily Reports

**Automatic Generation**:
- Generated every day at midnight
- Emailed to configured recipients
- Available in dashboard

**Contents**:
- Total transactions
- Income vs Expenses
- Net cash flow
- Top 5 customers
- Top 5 vendors
- Alerts and warnings

### Monthly Financial Statements

**Available Reports**:
1. **Balance Sheet**
2. **Income Statement**
3. **Cash Flow Statement**
4. **KPI Dashboard**
5. **Variance Analysis**

#### Viewing Reports

1. Navigate to **Reports** → **Monthly Statements**
2. Select month: November 2025
3. View summary or download

**Balance Sheet Example**:
```
BALANCE SHEET
As of: November 30, 2025

ASSETS
Current Assets:
  Cash and Cash Equivalents    $450,000
  Accounts Receivable           $320,000
  Inventory                     $180,000
  Prepaid Expenses               $25,000
  Total Current Assets          $975,000

Fixed Assets:
  Property, Plant, Equipment    $800,000
  Less: Accumulated Depr.      -$200,000
  Net Fixed Assets              $600,000

Total Assets                  $1,575,000

LIABILITIES
Current Liabilities:
  Accounts Payable              $180,000
  Short-term Debt                $50,000
  Accrued Expenses               $30,000
  Total Current Liabilities     $260,000

Long-term Liabilities:
  Long-term Debt                $300,000
  Total Liabilities             $560,000

EQUITY
Common Stock                    $500,000
Retained Earnings               $515,000
Total Equity                  $1,015,000

Total Liabilities + Equity    $1,575,000
```

#### KPI Dashboard

**Profitability**:
- Gross Profit Margin: 45.2%
- Operating Margin: 22.8%
- Net Profit Margin: 18.5%
- ROA: 15.3%
- ROE: 24.2%

**Liquidity**:
- Current Ratio: 3.75
- Quick Ratio: 3.06
- Cash Ratio: 1.73

**Efficiency**:
- Asset Turnover: 0.83
- Receivables Turnover: 11.25

**Leverage**:
- Debt to Assets: 0.36
- Debt to Equity: 0.55

### Executive Summary

**Monthly Highlights**:
- 📈 Revenue up 15.3% from last month
- 📊 Operating expenses down 8.2%
- 💰 Net income improved 25.1%
- ⚡ 5 fraud alerts (3 confirmed, 2 false positives)
- ✅ 98.5% compliance rate
- 🎯 All KPIs within target ranges

---

## 🔮 Predictive Analytics

### Cash Flow Forecasting

**6-Month Forecast**:
1. Navigate to **Predictive** → **Cash Flow Forecast**
2. View forecast chart
3. See confidence intervals

**Example Output**:
```
💰 Cash Flow Forecast (Next 6 Months)

Month 1 (Dec 2025):
  Predicted Income: $385,000
  Predicted Expenses: $245,000
  Net Cash Flow: $140,000 ✅
  Confidence: 94%

Month 2 (Jan 2026):
  Predicted Income: $320,000 (seasonal decrease)
  Predicted Expenses: $248,000
  Net Cash Flow: $72,000 ✅
  Confidence: 88%

Month 3 (Feb 2026):
  Predicted Income: $340,000
  Predicted Expenses: $251,000
  Net Cash Flow: $89,000 ✅
  Confidence: 82%

⚠️ Insights:
• January shows seasonal revenue dip
• Expenses trending upward (inflation)
• Cash flow remains positive all months
• Recommended cash reserve: $150,000

💡 Recommendations:
1. Build cash reserves before January dip
2. Review expense growth in Q1
3. Consider early customer invoicing for December
```

### Revenue Predictions

**By Segment**:
- Product Lines
- Service Categories
- Customer Segments
- Geographic Regions

**Growth Analysis**:
```
📈 Revenue Predictions (Q1 2026)

Product Line A:
  Current: $180,000/month
  Predicted: $195,000/month (+8.3%)
  Trend: Strong growth ✅
  Confidence: 91%

Product Line B:
  Current: $120,000/month
  Predicted: $115,000/month (-4.2%)
  Trend: Declining ⚠️
  Confidence: 87%

💡 Insight: Product Line B showing decline.
   Recommendation: Review pricing and marketing strategy.
```

### Budget Variance Prediction

**Early Warning System**:
```
⚠️ Budget Variance Alert

Category: Marketing
Current Spend: $18,500 (18 days)
Budget: $25,000 (full month)
Burn Rate: $1,028/day
Projected Month-End: $31,850

Variance: +$6,850 (27.4% over budget) 🔴

🚨 Alert: HIGH RISK OF OVERRUN

Recommendation:
• Pause non-essential campaigns
• Review cost per acquisition
• Consider reducing spend by 35% for remaining days
```

---

## 👥 User Roles & Permissions

### Admin

**Can Do**:
- ✅ Everything
- ✅ Toggle auto-processing
- ✅ Configure all settings
- ✅ Manage users
- ✅ View all reports
- ✅ Approve any amount

**Cannot Do**:
- ❌ Nothing restricted

### Head Accountant

**Can Do**:
- ✅ Toggle auto-processing
- ✅ Configure review thresholds
- ✅ Approve up to $50,000
- ✅ View all reports
- ✅ Assign reviewers
- ✅ Override fraud alerts

**Cannot Do**:
- ❌ Manage users
- ❌ Modify system settings
- ❌ Delete audit logs

### Accountant

**Can Do**:
- ✅ Review transactions
- ✅ Approve up to $10,000
- ✅ Complete checklists
- ✅ View assigned reports
- ✅ Submit fraud feedback

**Cannot Do**:
- ❌ Configure settings
- ❌ Toggle auto-processing
- ❌ Assign reviews
- ❌ Override fraud alerts

### Assistant

**Can Do**:
- ✅ View transactions (read-only)
- ✅ View reports
- ✅ View checklists
- ✅ Generate reports

**Cannot Do**:
- ❌ Approve/reject transactions
- ❌ Modify any settings
- ❌ Complete checklists
- ❌ Submit fraud feedback

---

## ❓ FAQ

**Q: What happens if I toggle auto-processing OFF?**  
A: All new transactions will require human review, regardless of amount or risk score. Existing approved transactions are not affected.

**Q: Can I change thresholds while auto-processing is ON?**  
A: Yes, you can adjust thresholds anytime. Changes apply to new transactions immediately.

**Q: How accurate is the fraud detection?**  
A: Our 4-layer system has 95%+ accuracy with continuous learning from your feedback.

**Q: What if both OpenAI and Claude are down?**  
A: The system will queue transactions and process them when AI services return. Critical operations continue without AI.

**Q: Can I customize checklist items?**  
A: Currently, checklists are predefined. Custom checklists coming in v2.0.

**Q: How long are audit logs kept?**  
A: Audit logs are retained for 7 years for compliance purposes.

**Q: Can I export data?**  
A: Yes, all reports can be exported to JSON, CSV, and PDF formats.

**Q: What's the ROI calculation based on?**  
A: Industry benchmarks for labor reduction, error reduction, and efficiency gains, customizable to your organization.

---

## 📞 Support

**Technical Issues**: support@yourdomain.com  
**Training**: training@yourdomain.com  
**Sales**: sales@yourdomain.com

**Documentation**: https://docs.yourdomain.com  
**Status Page**: https://status.yourdomain.com

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-03  
**For Questions**: Contact your administrator or support team
