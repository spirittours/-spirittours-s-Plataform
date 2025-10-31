/**
 * Unit Tests for WebSocket Event Handlers
 * Tests real-time communication features
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

// Mock WebSocket Server
class MockWebSocketServer {
    constructor() {
        this.rooms = new Map();
        this.sockets = new Map();
        this.events = [];
    }

    // Room management
    joinRoom(socketId, roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(socketId);
        
        this.events.push({
            type: 'join_room',
            socketId,
            roomId,
            timestamp: new Date()
        });
    }

    leaveRoom(socketId, roomId) {
        if (this.rooms.has(roomId)) {
            this.rooms.get(roomId).delete(socketId);
            
            // Clean up empty rooms
            if (this.rooms.get(roomId).size === 0) {
                this.rooms.delete(roomId);
            }
        }
        
        this.events.push({
            type: 'leave_room',
            socketId,
            roomId,
            timestamp: new Date()
        });
    }

    // Broadcast to room
    broadcastToRoom(roomId, event, data) {
        if (!this.rooms.has(roomId)) {
            return false;
        }

        const sockets = this.rooms.get(roomId);
        const broadcast = {
            type: 'broadcast',
            event,
            roomId,
            data,
            recipients: Array.from(sockets),
            timestamp: new Date()
        };

        this.events.push(broadcast);
        return true;
    }

    // Emit to specific socket
    emitToSocket(socketId, event, data) {
        this.events.push({
            type: 'emit',
            event,
            socketId,
            data,
            timestamp: new Date()
        });
    }

    // Get room members
    getRoomMembers(roomId) {
        if (!this.rooms.has(roomId)) {
            return [];
        }
        return Array.from(this.rooms.get(roomId));
    }

    // Clear events log
    clearEvents() {
        this.events = [];
    }

    // Get events by type
    getEventsByType(type) {
        return this.events.filter(e => e.type === type);
    }
}

// Mock Socket
class MockSocket {
    constructor(id, userId, userRole) {
        this.id = id;
        this.userId = userId;
        this.userRole = userRole;
        this.rooms = new Set();
        this.emittedEvents = [];
    }

    emit(event, data) {
        this.emittedEvents.push({ event, data, timestamp: new Date() });
    }

    join(room) {
        this.rooms.add(room);
    }

    leave(room) {
        this.rooms.delete(room);
    }

    disconnect() {
        this.rooms.clear();
    }
}

describe('WebSocket Event Handlers', function() {
    let server;
    let socket1;
    let socket2;

    beforeEach(function() {
        server = new MockWebSocketServer();
        socket1 = new MockSocket('socket-001', 'user-001', 'customer');
        socket2 = new MockSocket('socket-002', 'user-002', 'guide');
    });

    afterEach(function() {
        server.clearEvents();
    });

    describe('Room Management', function() {
        it('should allow socket to join a room', function() {
            server.joinRoom(socket1.id, 'trip-001');
            
            const members = server.getRoomMembers('trip-001');
            expect(members).to.include(socket1.id);
            expect(members).to.have.lengthOf(1);
        });

        it('should allow multiple sockets in same room', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.joinRoom(socket2.id, 'trip-001');
            
            const members = server.getRoomMembers('trip-001');
            expect(members).to.have.lengthOf(2);
            expect(members).to.include.members([socket1.id, socket2.id]);
        });

        it('should allow socket to leave a room', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.leaveRoom(socket1.id, 'trip-001');
            
            const members = server.getRoomMembers('trip-001');
            expect(members).to.have.lengthOf(0);
        });

        it('should clean up empty rooms', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.leaveRoom(socket1.id, 'trip-001');
            
            expect(server.rooms.has('trip-001')).to.be.false;
        });

        it('should track room join/leave events', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.leaveRoom(socket1.id, 'trip-001');
            
            const joinEvents = server.getEventsByType('join_room');
            const leaveEvents = server.getEventsByType('leave_room');
            
            expect(joinEvents).to.have.lengthOf(1);
            expect(leaveEvents).to.have.lengthOf(1);
        });
    });

    describe('Message Broadcasting', function() {
        beforeEach(function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.joinRoom(socket2.id, 'trip-001');
        });

        it('should broadcast message to all room members', function() {
            const messageData = {
                message_id: 'msg-001',
                sender_id: 'user-001',
                message: 'Hello everyone!',
                timestamp: new Date()
            };

            const success = server.broadcastToRoom('trip-001', 'new_message', messageData);
            
            expect(success).to.be.true;
            
            const broadcasts = server.getEventsByType('broadcast');
            expect(broadcasts).to.have.lengthOf(1);
            expect(broadcasts[0].recipients).to.include.members([socket1.id, socket2.id]);
        });

        it('should not broadcast to non-existent room', function() {
            const success = server.broadcastToRoom('trip-999', 'new_message', {});
            expect(success).to.be.false;
        });

        it('should track all broadcast events', function() {
            server.broadcastToRoom('trip-001', 'message_1', {});
            server.broadcastToRoom('trip-001', 'message_2', {});
            server.broadcastToRoom('trip-001', 'message_3', {});
            
            const broadcasts = server.getEventsByType('broadcast');
            expect(broadcasts).to.have.lengthOf(3);
        });
    });

    describe('Typing Indicators', function() {
        it('should broadcast typing indicator to room', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.joinRoom(socket2.id, 'trip-001');
            
            const typingData = {
                user_id: 'user-001',
                trip_id: 'trip-001',
                is_typing: true
            };

            server.broadcastToRoom('trip-001', 'user_typing', typingData);
            
            const broadcasts = server.getEventsByType('broadcast');
            expect(broadcasts[0].event).to.equal('user_typing');
            expect(broadcasts[0].data.is_typing).to.be.true;
        });

        it('should handle stop typing event', function() {
            server.joinRoom(socket1.id, 'trip-001');
            
            const typingData = {
                user_id: 'user-001',
                trip_id: 'trip-001',
                is_typing: false
            };

            server.broadcastToRoom('trip-001', 'user_typing', typingData);
            
            const broadcasts = server.getEventsByType('broadcast');
            expect(broadcasts[0].data.is_typing).to.be.false;
        });
    });

    describe('GPS Location Updates', function() {
        it('should broadcast GPS location to room members', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.joinRoom(socket2.id, 'trip-001');
            
            const locationData = {
                trip_id: 'trip-001',
                latitude: 19.4326,
                longitude: -99.1332,
                speed: 45.5,
                heading: 180,
                timestamp: new Date()
            };

            server.broadcastToRoom('trip-001', 'location_update', locationData);
            
            const broadcasts = server.getEventsByType('broadcast');
            expect(broadcasts).to.have.lengthOf(1);
            expect(broadcasts[0].data.latitude).to.equal(19.4326);
            expect(broadcasts[0].data.longitude).to.equal(-99.1332);
        });

        it('should handle location updates every 30 seconds', function() {
            server.joinRoom(socket1.id, 'trip-001');
            
            // Simulate 5 location updates
            for (let i = 0; i < 5; i++) {
                server.broadcastToRoom('trip-001', 'location_update', {
                    trip_id: 'trip-001',
                    latitude: 19.4326 + (i * 0.001),
                    longitude: -99.1332 + (i * 0.001),
                    timestamp: new Date()
                });
            }
            
            const broadcasts = server.getEventsByType('broadcast');
            expect(broadcasts).to.have.lengthOf(5);
        });
    });

    describe('Message Read Receipts', function() {
        it('should emit read receipt to sender', function() {
            const receiptData = {
                message_id: 'msg-001',
                read_by: 'user-002',
                read_at: new Date()
            };

            server.emitToSocket(socket1.id, 'message_read', receiptData);
            
            const emits = server.getEventsByType('emit');
            expect(emits).to.have.lengthOf(1);
            expect(emits[0].event).to.equal('message_read');
        });

        it('should track multiple read receipts', function() {
            server.emitToSocket(socket1.id, 'message_read', { message_id: 'msg-001' });
            server.emitToSocket(socket1.id, 'message_read', { message_id: 'msg-002' });
            server.emitToSocket(socket1.id, 'message_read', { message_id: 'msg-003' });
            
            const emits = server.getEventsByType('emit');
            expect(emits).to.have.lengthOf(3);
        });
    });

    describe('Online/Offline Status', function() {
        it('should broadcast user online status to room', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.joinRoom(socket2.id, 'trip-001');
            
            const statusData = {
                user_id: 'user-001',
                status: 'online',
                timestamp: new Date()
            };

            server.broadcastToRoom('trip-001', 'user_status', statusData);
            
            const broadcasts = server.getEventsByType('broadcast');
            expect(broadcasts[0].data.status).to.equal('online');
        });

        it('should handle disconnect and broadcast offline', function() {
            server.joinRoom(socket1.id, 'trip-001');
            
            const statusData = {
                user_id: 'user-001',
                status: 'offline',
                timestamp: new Date()
            };

            server.broadcastToRoom('trip-001', 'user_status', statusData);
            server.leaveRoom(socket1.id, 'trip-001');
            
            const broadcasts = server.getEventsByType('broadcast');
            expect(broadcasts[0].data.status).to.equal('offline');
        });
    });

    describe('Event Tracking and Logging', function() {
        it('should track all event types', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.broadcastToRoom('trip-001', 'test_event', {});
            server.emitToSocket(socket1.id, 'test_emit', {});
            server.leaveRoom(socket1.id, 'trip-001');
            
            expect(server.events).to.have.lengthOf(4);
        });

        it('should include timestamps for all events', function() {
            server.joinRoom(socket1.id, 'trip-001');
            
            const event = server.events[0];
            expect(event.timestamp).to.be.instanceOf(Date);
        });

        it('should allow clearing event history', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.clearEvents();
            
            expect(server.events).to.have.lengthOf(0);
        });
    });

    describe('Error Handling', function() {
        it('should handle leaving non-existent room gracefully', function() {
            expect(() => {
                server.leaveRoom(socket1.id, 'trip-999');
            }).to.not.throw();
        });

        it('should handle broadcast to empty room', function() {
            server.joinRoom(socket1.id, 'trip-001');
            server.leaveRoom(socket1.id, 'trip-001');
            
            const success = server.broadcastToRoom('trip-001', 'test', {});
            expect(success).to.be.false;
        });
    });

    describe('Scalability', function() {
        it('should handle multiple rooms efficiently', function() {
            // Create 10 rooms with 5 sockets each
            for (let room = 1; room <= 10; room++) {
                for (let socket = 1; socket <= 5; socket++) {
                    server.joinRoom(`socket-${room}-${socket}`, `trip-${room}`);
                }
            }
            
            expect(server.rooms.size).to.equal(10);
            
            // Check each room has 5 members
            for (let room = 1; room <= 10; room++) {
                const members = server.getRoomMembers(`trip-${room}`);
                expect(members).to.have.lengthOf(5);
            }
        });

        it('should handle high-frequency updates', function() {
            server.joinRoom(socket1.id, 'trip-001');
            
            // Simulate 100 rapid updates
            for (let i = 0; i < 100; i++) {
                server.broadcastToRoom('trip-001', 'location_update', {
                    latitude: 19.4326,
                    longitude: -99.1332
                });
            }
            
            const broadcasts = server.getEventsByType('broadcast');
            expect(broadcasts).to.have.lengthOf(100);
        });
    });
});

// Run tests if called directly
if (require.main === module) {
    require('mocha').run();
}

module.exports = { MockWebSocketServer, MockSocket };
