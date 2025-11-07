/**
 * AI Assistant Button - Integration Examples
 * 
 * This file demonstrates how to integrate the AIAssistantButton
 * component into various modules across the application.
 * 
 * SPRINT 2.3 - AIAssistantButton Integration Guide
 */

import React from 'react';
import AIAssistantButton from './AIAssistantButton';

// ============================================================================
// EXAMPLE 1: CRM Module - Contact Details
// ============================================================================
export const CRMContactExample = () => {
  const contact = {
    id: '123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Acme Corp',
    phone: '+1234567890',
    leadScore: 85,
    lastEngagement: '2024-01-15',
  };

  return (
    <div>
      {/* Your contact details UI here */}
      <h1>Contact: {contact.firstName} {contact.lastName}</h1>
      
      {/* AI Assistant Button with CRM context */}
      <AIAssistantButton
        module="crm"
        entityType="contact"
        entityId={contact.id}
        contextData={{
          name: `${contact.firstName} ${contact.lastName}`,
          email: contact.email,
          company: contact.company,
          leadScore: contact.leadScore,
          lastEngagement: contact.lastEngagement,
        }}
        color="primary"
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 2: CRM Module - Deal/Opportunity Details
// ============================================================================
export const CRMDealExample = () => {
  const deal = {
    id: '456',
    name: 'Enterprise Software License',
    amount: 50000,
    stage: 'negotiation',
    probability: 65,
    closeDate: '2024-03-01',
    accountName: 'Acme Corp',
  };

  return (
    <div>
      {/* Your deal details UI here */}
      <h1>Deal: {deal.name}</h1>
      
      {/* AI Assistant Button with Deal context */}
      <AIAssistantButton
        module="crm"
        entityType="deal"
        entityId={deal.id}
        contextData={{
          dealName: deal.name,
          amount: deal.amount,
          stage: deal.stage,
          probability: deal.probability,
          closeDate: deal.closeDate,
          accountName: deal.accountName,
        }}
        color="success"
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 3: Booking Module - Booking Details
// ============================================================================
export const BookingDetailsExample = () => {
  const booking = {
    id: 'BK-789',
    customerName: 'Jane Smith',
    destination: 'Bali, Indonesia',
    tripType: 'leisure',
    startDate: '2024-06-15',
    endDate: '2024-06-22',
    totalPrice: 3500,
    status: 'confirmed',
    specialRequests: 'Vegetarian meals, ocean view room',
  };

  return (
    <div>
      {/* Your booking details UI here */}
      <h1>Booking: {booking.id}</h1>
      
      {/* AI Assistant Button with Booking context */}
      <AIAssistantButton
        module="booking"
        entityType="booking"
        entityId={booking.id}
        contextData={{
          bookingNumber: booking.id,
          customerName: booking.customerName,
          destination: booking.destination,
          tripType: booking.tripType,
          dates: `${booking.startDate} to ${booking.endDate}`,
          totalPrice: booking.totalPrice,
          status: booking.status,
          specialRequests: booking.specialRequests,
        }}
        color="info"
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 4: Email Campaign Module - Campaign Details
// ============================================================================
export const CampaignDetailsExample = () => {
  const campaign = {
    id: 'CAMP-101',
    name: 'Summer Destinations 2024',
    subject: '🏖️ Discover Amazing Summer Destinations',
    status: 'sent',
    totalRecipients: 15000,
    openRate: 45,
    clickRate: 12,
    sentAt: '2024-06-01',
  };

  return (
    <div>
      {/* Your campaign details UI here */}
      <h1>Campaign: {campaign.name}</h1>
      
      {/* AI Assistant Button with Campaign context */}
      <AIAssistantButton
        module="campaign"
        entityType="email-campaign"
        entityId={campaign.id}
        contextData={{
          campaignName: campaign.name,
          subject: campaign.subject,
          status: campaign.status,
          recipients: campaign.totalRecipients,
          performance: {
            openRate: campaign.openRate,
            clickRate: campaign.clickRate,
          },
          sentDate: campaign.sentAt,
        }}
        color="secondary"
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 5: Project Module - Project Details
// ============================================================================
export const ProjectDetailsExample = () => {
  const project = {
    id: 'PROJ-555',
    name: 'Luxury Resort Package - Maldives',
    status: 'in_progress',
    startDate: '2024-07-01',
    endDate: '2024-07-15',
    completionPercentage: 65,
    tasks: {
      total: 20,
      completed: 13,
      pending: 7,
    },
    budget: 5000,
  };

  return (
    <div>
      {/* Your project details UI here */}
      <h1>Project: {project.name}</h1>
      
      {/* AI Assistant Button with Project context */}
      <AIAssistantButton
        module="project"
        entityType="project"
        entityId={project.id}
        contextData={{
          projectName: project.name,
          status: project.status,
          timeline: `${project.startDate} to ${project.endDate}`,
          completion: `${project.completionPercentage}%`,
          tasks: project.tasks,
          budget: project.budget,
        }}
        color="warning"
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 6: Analytics Dashboard - General AI Assistant
// ============================================================================
export const AnalyticsDashboardExample = () => {
  const analyticsData = {
    period: 'Last 30 Days',
    totalRevenue: 125000,
    totalBookings: 450,
    averageBookingValue: 278,
    topDestination: 'Cancun, Mexico',
    growthRate: 15.5,
  };

  return (
    <div>
      {/* Your analytics dashboard UI here */}
      <h1>Analytics Dashboard</h1>
      
      {/* AI Assistant Button with Analytics context */}
      <AIAssistantButton
        module="analytics"
        entityType="dashboard"
        contextData={{
          period: analyticsData.period,
          metrics: {
            revenue: analyticsData.totalRevenue,
            bookings: analyticsData.totalBookings,
            avgValue: analyticsData.averageBookingValue,
            topDestination: analyticsData.topDestination,
            growthRate: analyticsData.growthRate,
          },
        }}
        position={{ bottom: 80, right: 24 }} // Adjusted position
        color="primary"
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 7: General Assistant (No specific module)
// ============================================================================
export const GeneralAssistantExample = () => {
  return (
    <div>
      {/* Any page without specific module context */}
      <h1>General Page</h1>
      
      {/* AI Assistant Button without specific module */}
      <AIAssistantButton
        module="general"
        color="primary"
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 8: Custom Position and Color
// ============================================================================
export const CustomPositionExample = () => {
  return (
    <div>
      <h1>Custom Positioned Assistant</h1>
      
      {/* Bottom left position */}
      <AIAssistantButton
        module="general"
        position={{ bottom: 24, left: 24 }}
        color="error"
      />
    </div>
  );
};

// ============================================================================
// INTEGRATION INSTRUCTIONS
// ============================================================================

/*

HOW TO INTEGRATE AI ASSISTANT BUTTON:
======================================

1. Import the component:
   import AIAssistantButton from '../shared/AIAssistantButton';

2. Add to your component JSX (at the end, before closing div):
   <AIAssistantButton
     module="crm"           // Module name: crm, booking, campaign, project, analytics, general
     entityType="contact"   // Entity type within module (optional)
     entityId="123"         // Specific entity ID (optional)
     contextData={{         // Any relevant data for AI context (optional)
       name: "John Doe",
       email: "john@example.com",
       // ... other relevant data
     }}
     position={{            // Custom position (optional, defaults to bottom-right)
       bottom: 24,
       right: 24
     }}
     color="primary"        // MUI color (optional, defaults to 'primary')
   />

3. That's it! The button will appear as a floating action button with
   contextual AI assistance based on the module and data provided.

KEY FEATURES:
=============
- Module-specific smart prompts (pre-configured suggestions)
- Context-aware AI responses based on current data
- Conversation history (maintains context within session)
- Copy to clipboard functionality
- Quick actions for common tasks
- Real-time AI powered by MultiModelAI backend
- Beautiful Material-UI design
- Responsive and mobile-friendly
- Customizable position and color

SMART PROMPTS BY MODULE:
========================
CRM Contact:
- Draft follow-up email
- Analyze engagement
- Find similar contacts
- Identify upsell opportunities

CRM Deal:
- Calculate win probability
- Draft proposal
- Handle objections
- Suggest next steps

Booking:
- Generate confirmation email
- Suggest upsells
- Analyze customer preferences
- Optimize itinerary

Campaign:
- Generate subject lines
- Analyze performance
- Recommend segments
- Suggest A/B tests

Project:
- Optimize timeline
- Assess risks
- Generate status report
- Improve resource allocation

Analytics:
- Analyze trends
- Provide recommendations
- Detect anomalies
- Create executive summary

BACKEND INTEGRATION:
====================
The component calls: POST /api/ai/chat

Expected request body:
{
  "message": "User's question",
  "context": "Module and entity context",
  "conversationHistory": [...previous messages],
  "model": "gpt-4",
  "temperature": 0.7
}

Expected response:
{
  "response": "AI's answer",
  "model": "gpt-4",
  "usage": { ... }
}

*/
