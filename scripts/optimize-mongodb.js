/**
 * MongoDB Optimization Script
 * Creates indexes, analyzes slow queries, and optimizes collections
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spirittours';

async function optimizeDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // ==========================================
    // BOOKINGS COLLECTION
    // ==========================================
    console.log('📚 Optimizing bookings collection...');
    const bookingsCollection = db.collection('bookings');
    
    await bookingsCollection.createIndexes([
      { 
        key: { customer_id: 1, created_at: -1 }, 
        name: 'idx_customer_created',
        background: true 
      },
      { 
        key: { status: 1, travel_date: 1 }, 
        name: 'idx_status_travel_date',
        background: true 
      },
      { 
        key: { confirmation_number: 1 }, 
        name: 'idx_confirmation_number',
        unique: true,
        background: true 
      },
      { 
        key: { travel_date: 1 }, 
        name: 'idx_travel_date',
        background: true 
      },
      { 
        key: { created_at: -1 }, 
        name: 'idx_created_at',
        background: true 
      },
      {
        key: { customer_id: 1, status: 1 },
        name: 'idx_customer_status',
        background: true
      }
    ]);
    console.log('✅ Bookings indexes created');
    
    // ==========================================
    // USERS COLLECTION
    // ==========================================
    console.log('👥 Optimizing users collection...');
    const usersCollection = db.collection('users');
    
    await usersCollection.createIndexes([
      { 
        key: { email: 1 }, 
        name: 'idx_email',
        unique: true,
        background: true 
      },
      { 
        key: { role: 1 }, 
        name: 'idx_role',
        background: true 
      },
      { 
        key: { created_at: -1 }, 
        name: 'idx_created_at',
        background: true 
      },
      {
        key: { status: 1, role: 1 },
        name: 'idx_status_role',
        background: true
      },
      {
        key: { 'profile.phone': 1 },
        name: 'idx_phone',
        background: true,
        sparse: true
      }
    ]);
    console.log('✅ Users indexes created');
    
    // ==========================================
    // INVOICES COLLECTION
    // ==========================================
    console.log('📄 Optimizing invoices collection...');
    const invoicesCollection = db.collection('invoices');
    
    await invoicesCollection.createIndexes([
      { 
        key: { invoice_number: 1 }, 
        name: 'idx_invoice_number',
        unique: true,
        background: true 
      },
      { 
        key: { customer_id: 1, issue_date: -1 }, 
        name: 'idx_customer_issue_date',
        background: true 
      },
      { 
        key: { status: 1, due_date: 1 }, 
        name: 'idx_status_due_date',
        background: true 
      },
      { 
        key: { booking_id: 1 }, 
        name: 'idx_booking_id',
        background: true 
      },
      {
        key: { issue_date: -1 },
        name: 'idx_issue_date',
        background: true
      }
    ]);
    console.log('✅ Invoices indexes created');
    
    // ==========================================
    // AGENTS COLLECTION
    // ==========================================
    console.log('👔 Optimizing agents collection...');
    const agentsCollection = db.collection('agents');
    
    await agentsCollection.createIndexes([
      { 
        key: { tier: 1, commission_rate: 1 }, 
        name: 'idx_tier_commission',
        background: true 
      },
      { 
        key: { company_name: 1 }, 
        name: 'idx_company_name',
        background: true 
      },
      { 
        key: { email: 1 }, 
        name: 'idx_email',
        unique: true,
        background: true 
      },
      {
        key: { status: 1, tier: 1 },
        name: 'idx_status_tier',
        background: true
      }
    ]);
    console.log('✅ Agents indexes created');
    
    // ==========================================
    // PAYMENTS COLLECTION
    // ==========================================
    console.log('💳 Optimizing payments collection...');
    const paymentsCollection = db.collection('payments');
    
    await paymentsCollection.createIndexes([
      { 
        key: { booking_id: 1 }, 
        name: 'idx_booking_id',
        background: true 
      },
      { 
        key: { customer_id: 1, created_at: -1 }, 
        name: 'idx_customer_created',
        background: true 
      },
      { 
        key: { status: 1, payment_date: -1 }, 
        name: 'idx_status_payment_date',
        background: true 
      },
      { 
        key: { transaction_id: 1 }, 
        name: 'idx_transaction_id',
        unique: true,
        sparse: true,
        background: true 
      }
    ]);
    console.log('✅ Payments indexes created');
    
    // ==========================================
    // NOTIFICATIONS COLLECTION
    // ==========================================
    console.log('🔔 Optimizing notifications collection...');
    const notificationsCollection = db.collection('notifications');
    
    await notificationsCollection.createIndexes([
      { 
        key: { user_id: 1, created_at: -1 }, 
        name: 'idx_user_created',
        background: true 
      },
      { 
        key: { status: 1, priority: -1 }, 
        name: 'idx_status_priority',
        background: true 
      },
      { 
        key: { created_at: 1 }, 
        name: 'idx_created_ttl',
        expireAfterSeconds: 2592000, // 30 days
        background: true 
      }
    ]);
    console.log('✅ Notifications indexes created');
    
    // ==========================================
    // LOGS COLLECTION
    // ==========================================
    console.log('📋 Optimizing logs collection...');
    const logsCollection = db.collection('logs');
    
    await logsCollection.createIndexes([
      { 
        key: { timestamp: 1 }, 
        name: 'idx_timestamp_ttl',
        expireAfterSeconds: 7776000, // 90 days
        background: true 
      },
      { 
        key: { level: 1, timestamp: -1 }, 
        name: 'idx_level_timestamp',
        background: true 
      },
      { 
        key: { user_id: 1, timestamp: -1 }, 
        name: 'idx_user_timestamp',
        background: true,
        sparse: true 
      }
    ]);
    console.log('✅ Logs indexes created');
    
    // ==========================================
    // SESSIONS COLLECTION
    // ==========================================
    console.log('🔐 Optimizing sessions collection...');
    const sessionsCollection = db.collection('sessions');
    
    await sessionsCollection.createIndexes([
      { 
        key: { user_id: 1 }, 
        name: 'idx_user_id',
        background: true 
      },
      { 
        key: { expires_at: 1 }, 
        name: 'idx_expires_ttl',
        expireAfterSeconds: 0,
        background: true 
      }
    ]);
    console.log('✅ Sessions indexes created');
    
    // ==========================================
    // ANALYTICS COLLECTIONS
    // ==========================================
    console.log('📊 Optimizing analytics collections...');
    const analyticsCollection = db.collection('analytics_events');
    
    await analyticsCollection.createIndexes([
      { 
        key: { event_type: 1, timestamp: -1 }, 
        name: 'idx_event_type_timestamp',
        background: true 
      },
      { 
        key: { user_id: 1, timestamp: -1 }, 
        name: 'idx_user_timestamp',
        background: true,
        sparse: true 
      },
      { 
        key: { timestamp: 1 }, 
        name: 'idx_timestamp_ttl',
        expireAfterSeconds: 31536000, // 365 days
        background: true 
      }
    ]);
    console.log('✅ Analytics indexes created');
    
    // ==========================================
    // COLLECTION STATISTICS
    // ==========================================
    console.log('\n📊 Collection Statistics:');
    console.log('=' .repeat(60));
    
    const collections = [
      'bookings', 'users', 'invoices', 'agents', 
      'payments', 'notifications', 'logs', 'sessions',
      'analytics_events'
    ];
    
    for (const collName of collections) {
      try {
        const stats = await db.collection(collName).stats();
        console.log(`📚 ${collName.padEnd(20)} - ${stats.count.toLocaleString()} documents, ${formatBytes(stats.size)}`);
      } catch (error) {
        console.log(`⚠️  ${collName.padEnd(20)} - Collection not found or empty`);
      }
    }
    
    console.log('=' .repeat(60));
    
    // ==========================================
    // PERFORMANCE RECOMMENDATIONS
    // ==========================================
    console.log('\n💡 Performance Recommendations:');
    console.log('=' .repeat(60));
    
    const recommendations = [
      '1. Enable MongoDB profiling: db.setProfilingLevel(1, { slowms: 100 })',
      '2. Monitor slow queries regularly',
      '3. Use projection to fetch only required fields',
      '4. Implement pagination for large result sets',
      '5. Use aggregation pipeline with $match early',
      '6. Consider sharding for collections > 1M documents',
      '7. Regular backups scheduled daily',
      '8. Monitor index usage: db.collection.aggregate([{$indexStats:{}}])',
      '9. Remove unused indexes to improve write performance',
      '10. Use connection pooling (default: 100 connections)'
    ];
    
    recommendations.forEach(rec => console.log(`   ${rec}`));
    console.log('=' .repeat(60));
    
    console.log('\n✅ Database optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error optimizing database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run optimization
if (require.main === module) {
  optimizeDatabase()
    .then(() => {
      console.log('\n🎉 Optimization script finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Optimization script failed:', error);
      process.exit(1);
    });
}

module.exports = { optimizeDatabase };
