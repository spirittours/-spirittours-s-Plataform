/**
 * Integration Example: Complete Email Campaign Workflow
 * 
 * This file demonstrates how to use the AI Email Generator Service
 * together with the Email Sender Service to create and send campaigns.
 * 
 * WORKFLOW:
 * 1. AI generates personalized email content
 * 2. Emails are queued for human approval (optional)
 * 3. Approved emails are sent via hybrid system (SMTP/SendGrid)
 * 4. Analytics are tracked and used for learning
 */

const aiEmailGenerator = require('./ai-email-generator.service');
const emailSender = require('./email-sender.service');
const TravelAgency = require('../../models/TravelAgency');
const Campaign = require('../../models/Campaign');
const EmailLog = require('../../models/EmailLog');
const Product = require('../../models/Product');

/**
 * EXAMPLE 1: Send AI-Generated Email to Single Agency
 */
async function sendSingleAIEmail(agencyId) {
  try {
    // 1. Fetch agency data
    const agency = await TravelAgency.findById(agencyId);
    
    if (!agency || !agency.primaryEmail) {
      throw new Error('Agency not found or missing email');
    }
    
    // 2. Determine campaign type based on client status
    const campaignType = agency.clientStatus.isClient 
      ? 'client_update' 
      : 'prospect_intro';
    
    // 3. Generate email content with AI
    console.log(`Generating AI email for ${agency.name}...`);
    
    const emailContent = await aiEmailGenerator.generateEmail({
      agency: {
        name: agency.name,
        email: agency.primaryEmail,
        city: agency.address.city,
        country: agency.address.country,
        specialties: agency.specialties,
        isClient: agency.clientStatus.isClient,
        clientSince: agency.clientStatus.clientSince,
        leadScore: agency.prospecting.leadScore,
      },
      campaignType: campaignType,
      language: agency.emailPreferences.language || 'es',
      products: [], // Will be auto-selected by AI
    });
    
    console.log(`AI Email Generated:
      Subject: ${emailContent.subject}
      Model: ${emailContent.metadata.model}
      Tokens: ${emailContent.metadata.tokens}
      Cost: $${emailContent.metadata.cost.total.toFixed(4)}
    `);
    
    // 4. Save to approval queue (if required)
    const emailLog = new EmailLog({
      to: agency.primaryEmail,
      toName: agency.name,
      agency: agency._id,
      subject: emailContent.subject,
      preheader: emailContent.preheader,
      html: emailContent.html,
      text: emailContent.text,
      campaignType: campaignType,
      provider: emailSender.config.provider,
      status: 'queued',
      approved: false, // Requires approval
      aiGenerated: true,
      aiMetadata: emailContent.metadata,
      variables: emailContent.variables,
    });
    
    await emailLog.save();
    
    console.log(`Email saved to approval queue: ${emailLog._id}`);
    
    return {
      emailLogId: emailLog._id,
      subject: emailContent.subject,
      requiresApproval: true,
    };
    
  } catch (error) {
    console.error('Failed to send AI email:', error);
    throw error;
  }
}

/**
 * EXAMPLE 2: Approve and Send Email
 */
async function approveAndSendEmail(emailLogId, approvedBy) {
  try {
    // 1. Fetch email from queue
    const emailLog = await EmailLog.findById(emailLogId);
    
    if (!emailLog) {
      throw new Error('Email not found in queue');
    }
    
    if (emailLog.approved) {
      throw new Error('Email already approved');
    }
    
    // 2. Mark as approved
    emailLog.approved = true;
    emailLog.approvedBy = approvedBy;
    emailLog.approvedAt = new Date();
    await emailLog.save();
    
    console.log(`Email approved by ${approvedBy}`);
    
    // 3. Send email
    const result = await emailSender.sendEmail({
      to: emailLog.to,
      subject: emailLog.subject,
      html: emailLog.html,
      text: emailLog.text,
      metadata: {
        emailLogId: emailLog._id,
        agencyId: emailLog.agency,
        campaignType: emailLog.campaignType,
      },
    });
    
    // 4. Update email log
    emailLog.status = 'sent';
    emailLog.sentAt = new Date();
    emailLog.messageId = result.messageId;
    await emailLog.save();
    
    console.log(`Email sent successfully: ${result.messageId}`);
    
    return result;
    
  } catch (error) {
    console.error('Failed to approve and send email:', error);
    throw error;
  }
}

/**
 * EXAMPLE 3: Create Complete Campaign with AI
 */
async function createAICampaign(options) {
  const {
    name,
    type,
    targetAudience,
    filters,
    createdBy,
    language = 'es',
    requiresApproval = true,
  } = options;
  
  try {
    // 1. Create campaign
    const campaign = new Campaign({
      name,
      type,
      targetAudience,
      filters,
      status: 'draft',
      createdBy,
      requiresApproval,
    });
    
    // 2. Find target agencies
    const agencies = await findTargetAgencies(filters);
    
    campaign.recipients.agencies = agencies.map(a => a._id);
    campaign.recipients.total = agencies.length;
    
    console.log(`Campaign targets ${agencies.length} agencies`);
    
    // 3. Generate email variants with AI (for A/B testing)
    console.log('Generating email variants with AI...');
    
    const variants = await aiEmailGenerator.generateEmail({
      agency: agencies[0], // Use first agency as example
      campaignType: type,
      language: language,
      variations: 2, // Generate 2 variants for A/B test
    });
    
    // 4. Save variants to campaign
    campaign.email.variants = variants.map((variant, index) => ({
      name: `Variant ${String.fromCharCode(65 + index)}`, // A, B, C...
      subject: variant.subject,
      preheader: variant.preheader,
      html: variant.html,
      text: variant.text,
      percentage: 100 / variants.length, // Split equally
    }));
    
    campaign.aiGenerated = true;
    campaign.aiMetadata = {
      model: variants[0].metadata.model,
      generatedAt: variants[0].metadata.generatedAt,
      totalTokens: variants.reduce((sum, v) => sum + v.metadata.tokens, 0),
      totalCost: variants.reduce((sum, v) => sum + v.metadata.cost.total, 0),
    };
    
    await campaign.save();
    
    console.log(`Campaign created: ${campaign._id}`);
    console.log(`AI Generation Cost: $${campaign.aiMetadata.totalCost.toFixed(4)}`);
    
    return campaign;
    
  } catch (error) {
    console.error('Failed to create AI campaign:', error);
    throw error;
  }
}

/**
 * EXAMPLE 4: Process Campaign - Generate & Queue Emails
 */
async function processCampaign(campaignId) {
  try {
    const campaign = await Campaign.findById(campaignId)
      .populate('recipients.agencies');
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    if (campaign.status !== 'draft') {
      throw new Error('Campaign must be in draft status');
    }
    
    console.log(`Processing campaign: ${campaign.name}`);
    
    const agencies = campaign.recipients.agencies;
    const variants = campaign.email.variants;
    
    // Determine which variant each agency gets
    const emailsToGenerate = agencies.map((agency, index) => {
      // Simple round-robin for A/B testing
      const variantIndex = index % variants.length;
      const variant = variants[variantIndex];
      
      return {
        agency,
        variant,
        variantIndex,
      };
    });
    
    console.log(`Generating ${emailsToGenerate.length} emails...`);
    
    // Generate all emails in batches
    const batchSize = 10;
    const emailLogs = [];
    
    for (let i = 0; i < emailsToGenerate.length; i += batchSize) {
      const batch = emailsToGenerate.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ agency, variant, variantIndex }) => {
        // Personalize email with agency data
        let personalizedHtml = variant.html
          .replace(/\{\{agency_name\}\}/g, agency.name)
          .replace(/\{\{agency_city\}\}/g, agency.address.city)
          .replace(/\{\{agency_country\}\}/g, agency.address.country)
          .replace(/\{\{agency_email\}\}/g, agency.primaryEmail);
        
        // Create email log
        const emailLog = new EmailLog({
          to: agency.primaryEmail,
          toName: agency.name,
          agency: agency._id,
          campaign: campaign._id,
          subject: variant.subject,
          preheader: variant.preheader,
          html: personalizedHtml,
          text: variant.text,
          campaignType: campaign.type,
          provider: emailSender.config.provider,
          status: 'queued',
          approved: !campaign.requiresApproval,
          aiGenerated: campaign.aiGenerated,
          variables: {
            agency_name: agency.name,
            agency_city: agency.address.city,
            agency_country: agency.address.country,
            agency_email: agency.primaryEmail,
          },
        });
        
        await emailLog.save();
        return emailLog;
      });
      
      const batchResults = await Promise.all(batchPromises);
      emailLogs.push(...batchResults);
      
      console.log(`Batch ${Math.floor(i / batchSize) + 1} completed: ${batchResults.length} emails`);
    }
    
    // Update campaign status
    campaign.status = campaign.requiresApproval ? 'draft' : 'scheduled';
    await campaign.save();
    
    console.log(`Campaign processed: ${emailLogs.length} emails queued`);
    
    return {
      campaignId: campaign._id,
      totalEmails: emailLogs.length,
      requiresApproval: campaign.requiresApproval,
      emailLogIds: emailLogs.map(e => e._id),
    };
    
  } catch (error) {
    console.error('Failed to process campaign:', error);
    throw error;
  }
}

/**
 * EXAMPLE 5: Send Approved Campaign
 */
async function sendCampaign(campaignId) {
  try {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Get approved emails
    const emailLogs = await EmailLog.find({
      campaign: campaignId,
      approved: true,
      status: 'queued',
    });
    
    if (emailLogs.length === 0) {
      throw new Error('No approved emails to send');
    }
    
    console.log(`Sending campaign: ${emailLogs.length} emails`);
    
    // Update campaign status
    await campaign.start();
    
    // Queue all emails with smart delays
    const emailsToQueue = emailLogs.map(log => ({
      to: log.to,
      subject: log.subject,
      html: log.html,
      text: log.text,
      metadata: {
        emailLogId: log._id,
        campaignId: campaign._id,
        agencyId: log.agency,
      },
    }));
    
    const queueResult = await emailSender.queueBulkEmails(emailsToQueue);
    
    console.log(`Campaign queued:
      Total emails: ${queueResult.totalQueued}
      Estimated completion: ${Math.round(queueResult.estimatedTime / 1000 / 60)} minutes
    `);
    
    return queueResult;
    
  } catch (error) {
    console.error('Failed to send campaign:', error);
    throw error;
  }
}

/**
 * EXAMPLE 6: Monitor Campaign Performance
 */
async function monitorCampaign(campaignId) {
  try {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Update analytics from email logs
    await campaign.updateAnalytics();
    
    // Get detailed statistics
    const stats = await EmailLog.getAnalytics({
      campaignId: campaignId,
    });
    
    // Get queue status
    const queueStats = await emailSender.getQueueStatistics();
    
    console.log(`Campaign Performance: ${campaign.name}
      Status: ${campaign.status}
      Progress: ${campaign.progress}%
      
      Sent: ${stats.totalSent}
      Delivered: ${stats.totalDelivered} (${stats.deliveryRate}%)
      Opened: ${stats.totalOpened} (${stats.openRate}%)
      Clicked: ${stats.totalClicked} (${stats.clickRate}%)
      Bounced: ${stats.totalBounced} (${stats.bounceRate}%)
      
      Queue Status:
      Waiting: ${queueStats.waiting}
      Active: ${queueStats.active}
      Failed: ${queueStats.failed}
    `);
    
    return {
      campaign,
      stats,
      queueStats,
    };
    
  } catch (error) {
    console.error('Failed to monitor campaign:', error);
    throw error;
  }
}

/**
 * EXAMPLE 7: Learn from Campaign Results
 */
async function learnFromCampaign(campaignId) {
  try {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Select winning A/B test variant
    if (campaign.email.variants.length > 1 && !campaign.email.winningVariant) {
      const winner = await campaign.selectWinningVariant();
      console.log(`A/B Test Winner: ${winner.winnerName} (${winner.score.toFixed(2)}%)`);
    }
    
    // Re-initialize AI learning with latest data
    await aiEmailGenerator.initializeLearning();
    
    console.log('AI learning updated with campaign results');
    
    // Get high-performing emails for template creation
    const topEmails = await EmailLog.findHighPerforming(5);
    
    console.log(`Top performing emails:
${topEmails.map((e, i) => `
  ${i + 1}. ${e.subject}
     Open Rate: ${e.analytics.openRate}%
     Click Rate: ${e.analytics.clickRate}%
`).join('')}`);
    
    return {
      winner: campaign.email.winningVariant,
      topEmails: topEmails,
    };
    
  } catch (error) {
    console.error('Failed to learn from campaign:', error);
    throw error;
  }
}

/**
 * Helper: Find target agencies based on filters
 */
async function findTargetAgencies(filters) {
  const query = { status: 'active' };
  
  // Client status
  if (filters.clientStatus === 'client') {
    query['clientStatus.isClient'] = true;
  } else if (filters.clientStatus === 'prospect') {
    query['clientStatus.isClient'] = false;
  }
  
  // Geographic
  if (filters.countries && filters.countries.length > 0) {
    query['address.country'] = { $in: filters.countries };
  }
  
  if (filters.cities && filters.cities.length > 0) {
    query['address.city'] = { $in: filters.cities };
  }
  
  // Lead score
  if (filters.leadScore) {
    query['prospecting.leadScore'] = {
      $gte: filters.leadScore.min || 0,
      $lte: filters.leadScore.max || 100,
    };
  }
  
  // Specialties
  if (filters.specialties && filters.specialties.length > 0) {
    query['specialties'] = { $in: filters.specialties };
  }
  
  // Email preferences
  query['emailPreferences.subscribed'] = true;
  
  // No bounced emails
  query['emails.bounced'] = { $ne: true };
  
  return await TravelAgency.find(query)
    .sort({ 'prospecting.leadScore': -1 });
}

/**
 * EXAMPLE 8: Complete End-to-End Workflow
 */
async function completeWorkflow() {
  try {
    console.log('=== Starting Complete Campaign Workflow ===\n');
    
    // Step 1: Create campaign
    console.log('Step 1: Creating AI-powered campaign...');
    const campaign = await createAICampaign({
      name: 'Q4 2024 - New Destination Launch',
      type: 'prospect_intro',
      targetAudience: 'prospects',
      filters: {
        countries: ['Spain', 'Italy', 'France'],
        clientStatus: 'prospect',
        leadScore: { min: 60, max: 100 },
      },
      createdBy: 'admin-user-id',
      language: 'es',
      requiresApproval: true,
    });
    
    console.log(`✓ Campaign created: ${campaign._id}\n`);
    
    // Step 2: Process campaign (generate emails)
    console.log('Step 2: Processing campaign...');
    const processed = await processCampaign(campaign._id);
    console.log(`✓ ${processed.totalEmails} emails generated and queued for approval\n`);
    
    // Step 3: Simulate approval (in real app, this would be manual)
    console.log('Step 3: Approving emails...');
    for (const emailLogId of processed.emailLogIds.slice(0, 5)) {
      await approveAndSendEmail(emailLogId, 'manager-user-id');
    }
    console.log('✓ First 5 emails approved\n');
    
    // Step 4: Send campaign
    console.log('Step 4: Sending campaign...');
    const sent = await sendCampaign(campaign._id);
    console.log(`✓ Campaign sending started\n`);
    
    // Step 5: Monitor progress
    console.log('Step 5: Monitoring campaign...');
    const monitor = await monitorCampaign(campaign._id);
    console.log('✓ Campaign monitoring active\n');
    
    // Step 6: Learn from results (after campaign completes)
    console.log('Step 6: Learning from campaign...');
    const learning = await learnFromCampaign(campaign._id);
    console.log('✓ AI learning updated\n');
    
    console.log('=== Workflow Complete ===');
    
  } catch (error) {
    console.error('Workflow failed:', error);
    throw error;
  }
}

// Export all functions
module.exports = {
  sendSingleAIEmail,
  approveAndSendEmail,
  createAICampaign,
  processCampaign,
  sendCampaign,
  monitorCampaign,
  learnFromCampaign,
  completeWorkflow,
  
  // Helper
  findTargetAgencies,
};

/**
 * USAGE EXAMPLES:
 * 
 * // Send single AI email
 * await sendSingleAIEmail('agency-id-123');
 * 
 * // Approve and send
 * await approveAndSendEmail('email-log-id-123', 'user-id-456');
 * 
 * // Create complete campaign
 * const campaign = await createAICampaign({
 *   name: 'Summer 2024 Promotions',
 *   type: 'client_promotion',
 *   targetAudience: 'clients',
 *   filters: { countries: ['USA', 'Canada'] },
 *   createdBy: 'user-id',
 * });
 * 
 * // Run complete workflow
 * await completeWorkflow();
 */
