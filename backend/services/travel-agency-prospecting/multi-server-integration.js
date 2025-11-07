/**
 * Multi-Server Integration Examples
 * 
 * Demonstrates how to use the Multi-Server Manager with AI Email Generator
 * for maximum deliverability and scalability.
 * 
 * @author Spirit Tours Development Team
 */

const multiServerManager = require('./multi-server-manager.service');
const aiEmailGenerator = require('./ai-email-generator.service');
const TravelAgency = require('../../models/TravelAgency');
const Campaign = require('../../models/Campaign');
const EmailLog = require('../../models/EmailLog');

/**
 * EXAMPLE 1: Send Single Email with Multi-Server Rotation
 */
async function sendSingleEmailMultiServer(agencyId) {
  try {
    // 1. Fetch agency
    const agency = await TravelAgency.findById(agencyId);
    
    if (!agency || !agency.primaryEmail) {
      throw new Error('Agency not found or missing email');
    }
    
    // 2. Generate AI content
    const emailContent = await aiEmailGenerator.generateEmail({
      agency: {
        name: agency.name,
        email: agency.primaryEmail,
        city: agency.address.city,
        country: agency.address.country,
        isClient: agency.clientStatus.isClient,
      },
      campaignType: agency.clientStatus.isClient ? 'client_update' : 'prospect_intro',
      language: agency.emailPreferences.language || 'es',
    });
    
    // 3. Send via multi-server system (automatic rotation)
    const result = await multiServerManager.sendEmail({
      to: agency.primaryEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    
    console.log(`✅ Email sent via ${result.server} using IP ${result.ipAddress}`);
    
    // 4. Log to database
    const emailLog = new EmailLog({
      to: agency.primaryEmail,
      toName: agency.name,
      agency: agency._id,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      provider: 'multi-server',
      messageId: result.messageId,
      status: 'sent',
      sentAt: new Date(),
      aiGenerated: true,
      aiMetadata: emailContent.metadata,
    });
    
    await emailLog.save();
    
    return {
      success: true,
      emailLogId: emailLog._id,
      server: result.server,
      ipAddress: result.ipAddress,
    };
    
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * EXAMPLE 2: Send Campaign with Multi-Server (High Volume)
 */
async function sendCampaignMultiServer(campaignId) {
  try {
    const campaign = await Campaign.findById(campaignId)
      .populate('recipients.agencies');
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    console.log(`📧 Starting campaign: ${campaign.name}`);
    console.log(`📊 Recipients: ${campaign.recipients.agencies.length}`);
    
    // Get current multi-server statistics
    const stats = multiServerManager.getStatistics();
    console.log(`🖥️  Active servers: ${stats.global.activeServers}/${stats.global.totalServers}`);
    console.log(`📈 Daily capacity: ${multiServerManager.getTotalDailyCapacity()} emails`);
    
    const agencies = campaign.recipients.agencies;
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    // Send to all agencies with automatic server rotation
    for (const agency of agencies) {
      try {
        // Generate AI content
        const emailContent = await aiEmailGenerator.generateEmail({
          agency: {
            name: agency.name,
            email: agency.primaryEmail,
            city: agency.address.city,
            country: agency.address.country,
            isClient: agency.clientStatus.isClient,
          },
          campaignType: campaign.type,
          language: agency.emailPreferences.language || 'es',
        });
        
        // Send with multi-server rotation
        const result = await multiServerManager.sendEmail({
          to: agency.primaryEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
        
        // Log success
        const emailLog = new EmailLog({
          to: agency.primaryEmail,
          toName: agency.name,
          agency: agency._id,
          campaign: campaign._id,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          provider: 'multi-server',
          messageId: result.messageId,
          status: 'sent',
          sentAt: new Date(),
          aiGenerated: true,
        });
        
        await emailLog.save();
        
        results.push({
          agency: agency.name,
          success: true,
          server: result.server,
          ip: result.ipAddress,
        });
        
        successCount++;
        
        // Log progress every 10 emails
        if (successCount % 10 === 0) {
          console.log(`✅ Sent ${successCount}/${agencies.length} emails`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to send to ${agency.name}:`, error.message);
        failCount++;
        
        results.push({
          agency: agency.name,
          success: false,
          error: error.message,
        });
      }
    }
    
    console.log(`\n📊 Campaign Complete:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Success Rate: ${((successCount / agencies.length) * 100).toFixed(2)}%`);
    
    // Update campaign analytics
    await campaign.updateAnalytics();
    
    return {
      campaignId: campaign._id,
      totalRecipients: agencies.length,
      successCount,
      failCount,
      results,
    };
    
  } catch (error) {
    console.error('Campaign failed:', error);
    throw error;
  }
}

/**
 * EXAMPLE 3: Change Configuration Based on Volume
 */
async function scaleConfigurationAutomatically() {
  // Get current statistics
  const stats = multiServerManager.getStatistics();
  const capacity = multiServerManager.getTotalDailyCapacity();
  const utilizationRate = (stats.global.totalSent / capacity) * 100;
  
  console.log(`📊 Current Utilization: ${utilizationRate.toFixed(2)}%`);
  
  // Auto-scale based on utilization
  if (utilizationRate > 80) {
    console.log('⚠️  High utilization! Upgrading to higher tier...');
    
    // Get current preset
    const currentPreset = multiServerManager.config.activePreset;
    
    // Upgrade path
    const upgradePath = {
      'starter': 'basic-dual',
      'basic-dual': 'starter-triple',
      'starter-triple': 'professional',
      'professional': 'professional-plus',
      'professional-plus': 'business',
      'business': 'business-advanced',
      'business-advanced': 'enterprise',
      'enterprise': 'enterprise-plus',
      'enterprise-plus': 'enterprise-ultimate',
    };
    
    const nextPreset = upgradePath[currentPreset];
    
    if (nextPreset) {
      multiServerManager.loadPreset(nextPreset);
      console.log(`✅ Upgraded to: ${nextPreset}`);
      
      // Send notification to admins
      // TODO: Implement admin notification
    } else {
      console.log('ℹ️  Already at maximum tier');
    }
    
  } else if (utilizationRate < 20) {
    console.log('ℹ️  Low utilization. Consider downgrading to save costs.');
  } else {
    console.log('✅ Utilization is optimal');
  }
}

/**
 * EXAMPLE 4: Monitor Server Health and Get Recommendations
 */
async function monitorSystemHealth() {
  console.log('\n=== MULTI-SERVER HEALTH REPORT ===\n');
  
  // Get statistics
  const stats = multiServerManager.getStatistics();
  
  // Global stats
  console.log('📊 GLOBAL STATISTICS:');
  console.log(`   Total Servers: ${stats.global.totalServers}`);
  console.log(`   Active Servers: ${stats.global.activeServers}`);
  console.log(`   Total IPs: ${stats.global.totalIPs}`);
  console.log(`   Emails Sent Today: ${stats.global.totalSent}`);
  console.log(`   Average Reputation: ${stats.global.averageReputation}%`);
  
  // Server-by-server stats
  console.log('\n🖥️  SERVER DETAILS:');
  stats.servers.forEach((server, index) => {
    console.log(`\n   ${index + 1}. ${server.name}`);
    console.log(`      Health: ${server.health}`);
    console.log(`      Sent: ${server.totalSent}`);
    console.log(`      Delivered: ${server.totalDelivered}`);
    console.log(`      Failed: ${server.totalFailed}`);
    console.log(`      Reputation: ${server.reputation}%`);
    
    if (server.warmup) {
      console.log(`      Warmup: Day ${server.warmup.day} (${server.warmup.sentToday}/${server.warmup.dailyLimit})`);
    }
  });
  
  // Get recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  const recommendations = multiServerManager.getRecommendations();
  
  if (recommendations.length === 0) {
    console.log('   ✅ System is healthy. No recommendations.');
  } else {
    recommendations.forEach((rec, index) => {
      const icon = rec.level === 'critical' ? '🔴' 
                 : rec.level === 'warning' ? '⚠️' 
                 : 'ℹ️';
      console.log(`   ${icon} [${rec.level.toUpperCase()}] ${rec.message}`);
    });
  }
  
  console.log('\n=================================\n');
}

/**
 * EXAMPLE 5: Test All Presets
 */
async function comparePresets() {
  const presets = multiServerManager.getPresets();
  const comparison = [];
  
  console.log('\n=== PRESET COMPARISON ===\n');
  
  for (const [key, preset] of Object.entries(presets)) {
    comparison.push({
      name: preset.name,
      tier: preset.tier,
      servers: preset.servers.length,
      dailyCapacity: preset.capacity.emailsPerDay,
      monthlyCapacity: preset.capacity.emailsPerMonth,
      monthlyCost: preset.cost.monthly,
      costPer1000Emails: ((preset.cost.monthly / preset.capacity.emailsPerMonth) * 1000).toFixed(2),
      recommended: preset.recommended,
    });
  }
  
  // Sort by capacity
  comparison.sort((a, b) => a.dailyCapacity - b.dailyCapacity);
  
  // Print table
  console.log('PRESET NAME                           | TIER       | SERVERS | DAILY    | MONTHLY  | COST/MO | COST/1K | REC');
  console.log('--------------------------------------|------------|---------|----------|----------|---------|---------|----');
  
  comparison.forEach(p => {
    const rec = p.recommended ? '⭐' : '  ';
    console.log(
      `${p.name.padEnd(38)}| ${p.tier.padEnd(11)}| ${String(p.servers).padStart(7)} | ` +
      `${String(p.dailyCapacity).padStart(8)} | ${String(p.monthlyCapacity).padStart(8)} | ` +
      `$${String(p.monthlyCost).padStart(6)} | $${p.costPer1000Emails.padStart(6)} | ${rec}`
    );
  });
  
  console.log('\n=== END COMPARISON ===\n');
}

/**
 * EXAMPLE 6: Setup Custom Configuration for Specific Use Case
 */
async function setupCustomConfiguration() {
  console.log('\n=== CREATING CUSTOM CONFIGURATION ===\n');
  
  // Scenario: Need 8 servers for 4,000 emails/day with geographic distribution
  const customConfig = multiServerManager.createCustomConfig({
    name: 'Spirit Tours Custom - Geographic Distribution',
    serverCount: 9, // 3 per region
    dailyLimitPerServer: 450,
    includeSendGrid: true,
    sendGridDailyLimit: 1000, // For overflow
    regions: ['US', 'EU', 'LATAM'],
    warmupEnabled: true,
  });
  
  console.log('✅ Custom Configuration Created:');
  console.log(`   Name: ${customConfig.name}`);
  console.log(`   Servers: ${customConfig.servers.length}`);
  console.log(`   Daily Capacity: ${customConfig.capacity.emailsPerDay}`);
  console.log(`   Monthly Capacity: ${customConfig.capacity.emailsPerMonth}`);
  console.log(`   Cost: $${customConfig.cost.monthly}/month`);
  
  console.log('\n   Server Distribution:');
  const regionCounts = {};
  customConfig.servers.forEach(server => {
    const region = server.region || 'Cloud';
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  });
  
  Object.entries(regionCounts).forEach(([region, count]) => {
    console.log(`   - ${region}: ${count} servers`);
  });
  
  console.log('\n=== CONFIGURATION READY ===\n');
  
  return customConfig;
}

/**
 * EXAMPLE 7: Handle Server Failures with Automatic Failover
 */
async function demonstrateFailover() {
  console.log('\n=== FAILOVER DEMONSTRATION ===\n');
  
  // Listen to events
  multiServerManager.on('server-down', (event) => {
    console.log(`🔴 Server Down Alert: ${event.server}`);
    console.log(`   Error: ${event.error}`);
    console.log(`   System will automatically use other servers`);
  });
  
  multiServerManager.on('health-check-failed', (event) => {
    console.log(`⚠️  Health Check Failed: ${event.server}`);
  });
  
  // Simulate sending with a failed server
  try {
    const result = await multiServerManager.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test</p>',
      text: 'Test',
    });
    
    console.log(`✅ Email sent successfully via ${result.server}`);
    console.log(`   IP Address: ${result.ipAddress}`);
    
  } catch (error) {
    console.log(`❌ All servers failed. Error: ${error.message}`);
  }
  
  console.log('\n=== FAILOVER TEST COMPLETE ===\n');
}

/**
 * EXAMPLE 8: Daily Maintenance Routine
 */
async function dailyMaintenance() {
  console.log('\n🔧 STARTING DAILY MAINTENANCE...\n');
  
  // 1. Check system health
  console.log('1️⃣  Checking system health...');
  await monitorSystemHealth();
  
  // 2. Advance warmup for servers
  console.log('2️⃣  Advancing warmup schedules...');
  const stats = multiServerManager.getStatistics();
  stats.servers.forEach(server => {
    if (server.warmup && server.warmup.day <= 7) {
      multiServerManager.advanceWarmupDay(server.name);
      console.log(`   ✅ ${server.name} advanced to day ${server.warmup.day + 1}`);
    }
  });
  
  // 3. Check if scaling is needed
  console.log('3️⃣  Checking if scaling is needed...');
  await scaleConfigurationAutomatically();
  
  // 4. Reset daily counters (done automatically by system)
  console.log('4️⃣  Daily counters will reset at midnight automatically');
  
  // 5. Generate daily report
  console.log('5️⃣  Generating daily report...');
  const report = {
    date: new Date().toISOString().split('T')[0],
    totalSent: stats.global.totalSent,
    totalDelivered: stats.global.totalDelivered,
    averageReputation: stats.global.averageReputation,
    activeServers: stats.global.activeServers,
    downServers: stats.global.totalServers - stats.global.activeServers,
  };
  
  console.log('\n📊 DAILY REPORT:');
  console.log(JSON.stringify(report, null, 2));
  
  console.log('\n✅ MAINTENANCE COMPLETE\n');
}

/**
 * EXAMPLE 9: Real-World Scenario - Travel Agency Campaign
 */
async function realWorldCampaign() {
  console.log('\n=== REAL-WORLD CAMPAIGN EXAMPLE ===\n');
  
  // Scenario: Spirit Tours wants to send promotional email to 500 Spanish travel agencies
  
  // 1. Check current configuration
  console.log('1️⃣  Checking current configuration...');
  const currentPreset = multiServerManager.config.activePreset;
  console.log(`   Current: ${currentPreset}`);
  
  // 2. Determine optimal configuration for 500 emails
  console.log('\n2️⃣  Determining optimal configuration...');
  
  // For 500 emails, 'starter' is sufficient (500/day capacity)
  // But we want redundancy, so let's use 'basic-dual' (1000/day)
  multiServerManager.loadPreset('basic-dual');
  console.log('   ✅ Loaded: basic-dual (2 servers, 1000/day)');
  
  // 3. Create campaign
  console.log('\n3️⃣  Creating campaign...');
  const campaign = {
    name: 'Summer 2024 - Spain Travel Agencies',
    type: 'prospect_intro',
    targetCountry: 'Spain',
    targetCount: 500,
  };
  console.log(`   ✅ Campaign: ${campaign.name}`);
  
  // 4. Check system readiness
  console.log('\n4️⃣  Checking system readiness...');
  const stats = multiServerManager.getStatistics();
  const capacity = multiServerManager.getTotalDailyCapacity();
  console.log(`   Daily Capacity: ${capacity}`);
  console.log(`   Used Today: ${stats.global.totalSent}`);
  console.log(`   Remaining: ${capacity - stats.global.totalSent}`);
  
  if (capacity - stats.global.totalSent >= campaign.targetCount) {
    console.log('   ✅ Sufficient capacity available');
  } else {
    console.log('   ⚠️  Warning: May need to spread campaign over multiple days');
  }
  
  // 5. Estimate send time
  console.log('\n5️⃣  Estimating send time...');
  const delayBetweenEmails = 6000; // 6 seconds
  const estimatedMinutes = (campaign.targetCount * delayBetweenEmails / 1000 / 60).toFixed(2);
  console.log(`   Estimated time: ${estimatedMinutes} minutes`);
  
  // 6. Send campaign (simulated)
  console.log('\n6️⃣  Campaign ready to send!');
  console.log('   Run: sendCampaignMultiServer(campaignId)');
  
  console.log('\n=== CAMPAIGN SETUP COMPLETE ===\n');
}

// Export all functions
module.exports = {
  sendSingleEmailMultiServer,
  sendCampaignMultiServer,
  scaleConfigurationAutomatically,
  monitorSystemHealth,
  comparePresets,
  setupCustomConfiguration,
  demonstrateFailover,
  dailyMaintenance,
  realWorldCampaign,
};

/**
 * CLI USAGE:
 * 
 * // Send single email with rotation
 * node -e "require('./multi-server-integration').sendSingleEmailMultiServer('agency-id-123')"
 * 
 * // Monitor system health
 * node -e "require('./multi-server-integration').monitorSystemHealth()"
 * 
 * // Compare all presets
 * node -e "require('./multi-server-integration').comparePresets()"
 * 
 * // Daily maintenance
 * node -e "require('./multi-server-integration').dailyMaintenance()"
 */
