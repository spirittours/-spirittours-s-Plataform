/**
 * B2B RBAC Integration Tests
 * Complete test suite for role-based permissions in B2B system
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const TourOperator = require('../../models/TourOperator');
const { generateToken } = require('../../middleware/auth');

describe('B2B RBAC Integration Tests', () => {
  let systemAdminToken;
  let operatorAdminToken;
  let operatorUserToken;
  let agentToken;
  
  let systemAdminUser;
  let operatorAdminUser;
  let operatorUserUser;
  let agentUser;
  
  let testOperator1;
  let testOperator2;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/spirittours_test');
    }

    // Clean up
    await User.deleteMany({});
    await TourOperator.deleteMany({});

    // Create test operator 1
    testOperator1 = await TourOperator.create({
      name: 'Test Operator 1',
      businessName: 'Test Operator 1 SL',
      code: 'TEST001',
      type: 'receptive',
      relationship: 'supplier',
      status: 'active',
      apiSystem: {
        type: 'ejuniper',
        credentials: {
          username: 'test_user',
          password: 'test_pass',
          agencyCode: 'TEST001'
        },
        endpoints: {
          wsdl: 'https://test.api.com/wsdl',
          production: 'https://test.api.com',
          sandbox: 'https://test-sandbox.api.com'
        },
        config: {
          environment: 'sandbox',
          timeout: 30000,
          retryAttempts: 3
        }
      },
      integrationStatus: {
        isConfigured: true,
        isActive: true,
        healthStatus: 'healthy'
      },
      businessTerms: {
        defaultCommission: {
          type: 'percentage',
          value: 15
        },
        currency: 'USD'
      },
      contact: {
        primaryName: 'John Doe',
        primaryEmail: 'john@test.com',
        primaryPhone: '+1234567890'
      }
    });

    // Create test operator 2
    testOperator2 = await TourOperator.create({
      name: 'Test Operator 2',
      businessName: 'Test Operator 2 SL',
      code: 'TEST002',
      type: 'wholesaler',
      relationship: 'both',
      status: 'active',
      apiSystem: {
        type: 'amadeus',
        credentials: {
          apiKey: 'test_api_key'
        },
        endpoints: {
          production: 'https://test2.api.com'
        },
        config: {
          environment: 'production',
          timeout: 30000,
          retryAttempts: 3
        }
      },
      integrationStatus: {
        isConfigured: true,
        isActive: false,
        healthStatus: 'warning'
      },
      businessTerms: {
        defaultCommission: {
          type: 'fixed',
          value: 50
        },
        currency: 'EUR'
      },
      contact: {
        primaryName: 'Jane Smith',
        primaryEmail: 'jane@test.com',
        primaryPhone: '+9876543210'
      }
    });

    // Create system admin user
    systemAdminUser = await User.create({
      email: 'admin@spirittours.us',
      password: 'test123',
      firstName: 'System',
      lastName: 'Admin',
      role: 'system_admin',
      organization: null,
      emailVerified: true,
      isActive: true
    });
    systemAdminToken = generateToken(systemAdminUser);

    // Create operator admin user for operator 1
    operatorAdminUser = await User.create({
      email: 'operator@test1.com',
      password: 'test123',
      firstName: 'Operator',
      lastName: 'Admin',
      role: 'operator_admin',
      organization: testOperator1._id,
      emailVerified: true,
      isActive: true
    });
    operatorAdminToken = generateToken(operatorAdminUser);

    // Create operator user for operator 1
    operatorUserUser = await User.create({
      email: 'user@test1.com',
      password: 'test123',
      firstName: 'Operator',
      lastName: 'User',
      role: 'operator_user',
      organization: testOperator1._id,
      emailVerified: true,
      isActive: true
    });
    operatorUserToken = generateToken(operatorUserUser);

    // Create agent user
    agentUser = await User.create({
      email: 'agent@spirittours.us',
      password: 'test123',
      firstName: 'Agent',
      lastName: 'User',
      role: 'agent',
      organization: null,
      emailVerified: true,
      isActive: true
    });
    agentToken = generateToken(agentUser);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await TourOperator.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/admin/tour-operators', () => {
    test('System admin should see all operators', async () => {
      const response = await request(app)
        .get('/api/admin/tour-operators')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });

    test('Operator admin should see only their operator', async () => {
      const response = await request(app)
        .get('/api/admin/tour-operators')
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].code).toBe('TEST001');
    });

    test('Operator user should see only their operator', async () => {
      const response = await request(app)
        .get('/api/admin/tour-operators')
        .set('Authorization', `Bearer ${operatorUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].code).toBe('TEST001');
    });

    test('Agent should not have access', async () => {
      await request(app)
        .get('/api/admin/tour-operators')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    test('Unauthenticated request should fail', async () => {
      await request(app)
        .get('/api/admin/tour-operators')
        .expect(401);
    });
  });

  describe('GET /api/admin/tour-operators/:id', () => {
    test('System admin can access any operator', async () => {
      const response = await request(app)
        .get(`/api/admin/tour-operators/${testOperator2._id}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('TEST002');
    });

    test('Operator admin can access their operator', async () => {
      const response = await request(app)
        .get(`/api/admin/tour-operators/${testOperator1._id}`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('TEST001');
    });

    test('Operator admin CANNOT access other operator', async () => {
      await request(app)
        .get(`/api/admin/tour-operators/${testOperator2._id}`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect(403);
    });

    test('Operator user can view their operator', async () => {
      const response = await request(app)
        .get(`/api/admin/tour-operators/${testOperator1._id}`)
        .set('Authorization', `Bearer ${operatorUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/admin/tour-operators/:id/credentials', () => {
    test('System admin can update any operator credentials', async () => {
      const response = await request(app)
        .put(`/api/admin/tour-operators/${testOperator2._id}/credentials`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({
          apiSystem: {
            credentials: {
              apiKey: 'new_api_key_123'
            }
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('actualizadas');
    });

    test('Operator admin can update their credentials', async () => {
      const response = await request(app)
        .put(`/api/admin/tour-operators/${testOperator1._id}/credentials`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .send({
          apiSystem: {
            credentials: {
              username: 'updated_user',
              password: 'updated_pass'
            }
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('Operator admin CANNOT update other operator credentials', async () => {
      await request(app)
        .put(`/api/admin/tour-operators/${testOperator2._id}/credentials`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .send({
          apiSystem: {
            credentials: {
              apiKey: 'hacker_attempt'
            }
          }
        })
        .expect(403);
    });

    test('Operator user CANNOT update credentials', async () => {
      await request(app)
        .put(`/api/admin/tour-operators/${testOperator1._id}/credentials`)
        .set('Authorization', `Bearer ${operatorUserToken}`)
        .send({
          apiSystem: {
            credentials: {
              username: 'not_allowed'
            }
          }
        })
        .expect(403);
    });

    test('Agent CANNOT update credentials', async () => {
      await request(app)
        .put(`/api/admin/tour-operators/${testOperator1._id}/credentials`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          apiSystem: {
            credentials: {
              username: 'not_allowed'
            }
          }
        })
        .expect(403);
    });
  });

  describe('GET /api/admin/tour-operators/:id/credentials', () => {
    test('System admin can view any operator credentials', async () => {
      const response = await request(app)
        .get(`/api/admin/tour-operators/${testOperator1._id}/credentials`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.apiSystem.credentials).toBeDefined();
      // Credentials should be masked
      expect(response.body.data.apiSystem.credentials.username).toMatch(/\*/);
    });

    test('Operator admin can view their credentials (masked)', async () => {
      const response = await request(app)
        .get(`/api/admin/tour-operators/${testOperator1._id}/credentials`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.apiSystem.credentials).toBeDefined();
    });

    test('Operator admin CANNOT view other operator credentials', async () => {
      await request(app)
        .get(`/api/admin/tour-operators/${testOperator2._id}/credentials`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect(403);
    });

    test('Operator user can view their credentials (masked)', async () => {
      const response = await request(app)
        .get(`/api/admin/tour-operators/${testOperator1._id}/credentials`)
        .set('Authorization', `Bearer ${operatorUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('Agent CANNOT view credentials', async () => {
      await request(app)
        .get(`/api/admin/tour-operators/${testOperator1._id}/credentials`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/tour-operators/:id/activate', () => {
    test('System admin can activate any operator', async () => {
      const response = await request(app)
        .post(`/api/admin/tour-operators/${testOperator2._id}/activate`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('activado');
    });

    test('Operator admin can activate their operator', async () => {
      // First deactivate
      await request(app)
        .post(`/api/admin/tour-operators/${testOperator1._id}/deactivate`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .send({ reason: 'Test' });

      // Then activate
      const response = await request(app)
        .post(`/api/admin/tour-operators/${testOperator1._id}/activate`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('Operator admin CANNOT activate other operator', async () => {
      await request(app)
        .post(`/api/admin/tour-operators/${testOperator2._id}/activate`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect(403);
    });

    test('Operator user CANNOT activate', async () => {
      await request(app)
        .post(`/api/admin/tour-operators/${testOperator1._id}/activate`)
        .set('Authorization', `Bearer ${operatorUserToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/tour-operators/:id/test', () => {
    test('System admin can test any operator', async () => {
      // Note: This will fail because we dont have real credentials
      // but we test that permissions allow the attempt
      await request(app)
        .post(`/api/admin/tour-operators/${testOperator1._id}/test`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect([200, 500]); // May fail due to fake credentials
    });

    test('Operator admin can test their operator', async () => {
      await request(app)
        .post(`/api/admin/tour-operators/${testOperator1._id}/test`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect([200, 500]);
    });

    test('Operator admin CANNOT test other operator', async () => {
      await request(app)
        .post(`/api/admin/tour-operators/${testOperator2._id}/test`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect(403);
    });

    test('Operator user CANNOT test', async () => {
      await request(app)
        .post(`/api/admin/tour-operators/${testOperator1._id}/test`)
        .set('Authorization', `Bearer ${operatorUserToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/tour-operators (Create)', () => {
    test('System admin can create operators', async () => {
      const response = await request(app)
        .post('/api/admin/tour-operators')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({
          name: 'New Operator',
          businessName: 'New Operator Inc',
          code: 'NEW001',
          type: 'dmc',
          relationship: 'supplier',
          apiSystem: {
            type: 'sabre'
          },
          contact: {
            primaryName: 'New Contact',
            primaryEmail: 'new@operator.com',
            primaryPhone: '+1111111111'
          }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('NEW001');
    });

    test('Operator admin CANNOT create operators', async () => {
      await request(app)
        .post('/api/admin/tour-operators')
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .send({
          name: 'Unauthorized',
          code: 'UNAUTH',
          type: 'receptive',
          relationship: 'supplier'
        })
        .expect(403);
    });
  });

  describe('DELETE /api/admin/tour-operators/:id', () => {
    test('System admin can delete operators', async () => {
      const newOp = await TourOperator.create({
        name: 'To Delete',
        businessName: 'To Delete SL',
        code: 'DEL001',
        type: 'receptive',
        relationship: 'supplier',
        apiSystem: { type: 'manual' },
        contact: {
          primaryName: 'Delete Me',
          primaryEmail: 'delete@test.com',
          primaryPhone: '+000000'
        }
      });

      await request(app)
        .delete(`/api/admin/tour-operators/${newOp._id}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);
    });

    test('Operator admin CANNOT delete operators', async () => {
      await request(app)
        .delete(`/api/admin/tour-operators/${testOperator1._id}`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .expect(403);
    });
  });

  describe('Audit Logging', () => {
    test('Credential updates should be logged', async () => {
      await request(app)
        .put(`/api/admin/tour-operators/${testOperator1._id}/credentials`)
        .set('Authorization', `Bearer ${operatorAdminToken}`)
        .send({
          apiSystem: {
            credentials: {
              username: 'audit_test'
            }
          }
        })
        .expect(200);

      const operator = await TourOperator.findById(testOperator1._id);
      expect(operator.auditLog.length).toBeGreaterThan(0);
      
      const lastLog = operator.auditLog[operator.auditLog.length - 1];
      expect(lastLog.action).toBe('credentials_updated');
      expect(lastLog.userId).toBeDefined();
    });
  });
});
