/**
 * Booking to Project Bridge Service
 * 
 * Integración entre Bookings y CRM Projects.
 * Convierte bookings confirmados en projects gestionados automáticamente.
 * 
 * Features:
 * - Auto-create projects from confirmed bookings
 * - Generate standard project tasks based on trip timeline
 * - Attach booking documents to project
 * - Initialize time tracking
 * - Create or link customer contact
 * - Automated milestone creation
 * 
 * Sprint 1.3 - Booking to Project Integration
 */

const Booking = require('../../models/Booking');
const Project = require('../../models/Project');
const Contact = require('../../models/Contact');
const Document = require('../../models/Document');
const Activity = require('../../models/Activity');
const logger = require('../logging/logger');

class BookingToProjectBridge {
  constructor() {
    // Standard task templates based on booking timeline
    this.taskTemplates = {
      'pre_trip': [
        { 
          title: 'Send booking confirmation', 
          description: 'Email confirmation with booking details',
          daysFromBooking: 0 
        },
        { 
          title: 'Process payment and deposit', 
          description: 'Verify deposit payment received',
          daysFromBooking: 1 
        },
        { 
          title: 'Arrange transportation', 
          description: 'Book flights, transfers, and local transport',
          daysFromStart: -14 
        },
        { 
          title: 'Confirm hotel reservations', 
          description: 'Verify all accommodation bookings',
          daysFromStart: -10 
        },
        { 
          title: 'Send pre-trip information package', 
          description: 'Send itinerary, travel docs, tips, emergency contacts',
          daysFromStart: -7 
        },
        { 
          title: 'Final payment reminder', 
          description: 'Request balance payment before departure',
          daysFromStart: -5 
        },
        { 
          title: 'Pre-departure check-in call', 
          description: 'Confirm everything is ready, answer questions',
          daysFromStart: -2 
        }
      ],
      'during_trip': [
        { 
          title: 'Welcome call/message', 
          description: 'Check guest arrived safely, welcome message',
          daysFromStart: 0 
        },
        { 
          title: 'Mid-trip check-in', 
          description: 'Verify everything going well, address any issues',
          daysFromStart: 'mid' // calculated dynamically
        }
      ],
      'post_trip': [
        { 
          title: 'Post-trip follow-up', 
          description: 'Thank you message, request feedback',
          daysFromEnd: 1 
        },
        { 
          title: 'Send satisfaction survey', 
          description: 'Collect detailed feedback and ratings',
          daysFromEnd: 3 
        },
        { 
          title: 'Request testimonial/review', 
          description: 'Ask for review on TripAdvisor, Google, website',
          daysFromEnd: 7 
        },
        { 
          title: 'Upsell future trips', 
          description: 'Offer repeat customer discount, new destinations',
          daysFromEnd: 30 
        }
      ]
    };

    // Milestone templates
    this.milestoneTemplates = [
      { name: 'Booking Confirmed', description: 'Initial booking confirmed and deposit received' },
      { name: 'Pre-Trip Preparation', description: 'All logistics arranged and confirmed' },
      { name: 'Trip Start', description: 'Guest departure - trip begins' },
      { name: 'Trip Completion', description: 'Guest returns - trip completed' },
      { name: 'Post-Trip Follow-up', description: 'Feedback collected and processed' }
    ];
  }

  /**
   * Convertir booking confirmado en project CRM
   */
  async convertBookingToProject(bookingId, workspaceId) {
    try {
      logger.info('Converting booking to project', { bookingId, workspaceId });

      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'confirmed') {
        logger.warn('Booking not confirmed, skipping project creation', { 
          bookingId, 
          status: booking.status 
        });
        return { 
          success: false, 
          reason: 'booking_not_confirmed',
          message: 'Only confirmed bookings can be converted to projects'
        };
      }

      if (booking.projectId) {
        logger.warn('Booking already has associated project', { 
          bookingId, 
          projectId: booking.projectId 
        });
        return { 
          success: false, 
          reason: 'project_already_exists',
          projectId: booking.projectId
        };
      }

      // Crear o encontrar contact
      const contact = await this.createOrFindContact(booking, workspaceId);

      // Crear project
      const project = await this.createProject(booking, contact._id, workspaceId);

      // Crear tasks
      await this.createProjectTasks(project._id, booking);

      // Crear milestones
      await this.createProjectMilestones(project._id, booking);

      // Adjuntar documentos
      await this.attachBookingDocuments(project._id, booking, workspaceId);

      // Inicializar time tracking (placeholder)
      await this.initializeTimeTracking(project._id, workspaceId);

      // Vincular booking con project
      booking.projectId = project._id;
      booking.contactId = contact._id;
      await booking.save();

      // Crear activity
      await this.createActivity({
        workspaceId,
        entityType: 'project',
        entityId: project._id,
        type: 'project_created',
        description: `Project auto-created from booking ${booking.bookingNumber}`,
        metadata: { 
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          destination: booking.destination,
          totalPrice: booking.totalPrice
        }
      });

      logger.info('Project created from booking successfully', { 
        bookingId, 
        projectId: project._id,
        contactId: contact._id
      });

      return {
        success: true,
        projectId: project._id,
        contactId: contact._id,
        tasksCreated: project.tasks.length,
        milestonesCreated: project.milestones.length,
        message: 'Project created successfully'
      };

    } catch (error) {
      logger.error('Error converting booking to project', { 
        error: error.message, 
        bookingId 
      });
      throw error;
    }
  }

  /**
   * Crear o encontrar contact del customer
   */
  async createOrFindContact(booking, workspaceId) {
    try {
      // Buscar contact existente
      let contact = await Contact.findOne({ 
        workspace: workspaceId, 
        email: booking.customer.email 
      });

      if (contact) {
        // Actualizar contact a customer si es lead
        if (contact.type === 'lead') {
          contact.type = 'customer';
          contact.tags = contact.tags.filter(t => t !== 'lead');
          if (!contact.tags.includes('customer')) {
            contact.tags.push('customer', 'booked');
          }
        }
        
        // Actualizar engagement
        contact.engagementScore = (contact.engagementScore || 0) + 25;
        contact.lastActivityDate = new Date();
        
        await contact.save();
        
        logger.info('Existing contact updated to customer', { contactId: contact._id });
        return contact;
      }

      // Crear nuevo contact
      contact = await Contact.create({
        workspace: workspaceId,
        type: 'customer',
        firstName: booking.customer.firstName,
        lastName: booking.customer.lastName,
        email: booking.customer.email,
        phone: booking.customer.phone,
        company: booking.customer.company,
        
        // Scoring
        leadScore: 100, // Booked = perfect score
        leadQuality: 'hot',
        leadSource: 'booking',
        
        // Engagement
        engagementScore: 50, // High engagement
        lastActivityDate: new Date(),
        
        // Metadata
        tags: ['customer', 'booked', booking.tripType],
        notes: `Customer from booking ${booking.bookingNumber}\n\nDestination: ${booking.destination}\nTrip Value: ${booking.currency} ${booking.totalPrice}`,
        
        // Custom fields
        customFields: {
          firstBookingDate: booking.bookingDate,
          totalBookings: 1,
          lifetimeValue: booking.totalPrice,
          preferredDestinations: [booking.destination],
          tripType: booking.tripType
        }
      });

      logger.info('New customer contact created from booking', { contactId: contact._id });
      return contact;

    } catch (error) {
      logger.error('Error creating/finding contact', { error: error.message });
      throw error;
    }
  }

  /**
   * Crear project desde booking
   */
  async createProject(booking, clientId, workspaceId) {
    try {
      const projectName = `${booking.destination} Trip - ${booking.customer.firstName} ${booking.customer.lastName}`;
      
      const project = await Project.create({
        workspace: workspaceId,
        name: projectName,
        description: this.generateProjectDescription(booking),
        client: clientId,
        
        // Status
        status: 'in_progress',
        health: 'on_track',
        progress: 0,
        
        // Dates
        startDate: booking.startDate,
        endDate: booking.endDate,
        
        // Budget
        budget: {
          total: booking.totalPrice,
          spent: booking.deposit || 0,
          currency: booking.currency
        },
        
        // Team (will be assigned later)
        team: [],
        
        // Metadata
        tags: ['booking', booking.tripType, 'auto-created'],
        
        // Custom fields
        customFields: {
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          numberOfTravelers: booking.numberOfTravelers,
          tripType: booking.tripType,
          specialRequests: booking.specialRequests
        }
      });

      logger.info('Project created from booking', { 
        projectId: project._id, 
        bookingNumber: booking.bookingNumber 
      });

      return project;

    } catch (error) {
      logger.error('Error creating project', { error: error.message });
      throw error;
    }
  }

  /**
   * Crear tasks del project basado en timeline
   */
  async createProjectTasks(projectId, booking) {
    try {
      const tasks = [];
      const now = new Date();
      const bookingDate = new Date(booking.bookingDate);
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const midTripDate = new Date(startDate.getTime() + (duration / 2) * 24 * 60 * 60 * 1000);

      // Pre-trip tasks
      for (const template of this.taskTemplates.pre_trip) {
        let dueDate;
        
        if (template.daysFromBooking !== undefined) {
          dueDate = new Date(bookingDate.getTime() + template.daysFromBooking * 24 * 60 * 60 * 1000);
        } else if (template.daysFromStart !== undefined) {
          dueDate = new Date(startDate.getTime() + template.daysFromStart * 24 * 60 * 60 * 1000);
        }

        // Determinar status basado en due date
        let status = 'pending';
        if (dueDate < now) {
          status = template.daysFromBooking === 0 ? 'completed' : 'overdue';
        }

        tasks.push({
          title: template.title,
          description: template.description,
          status,
          priority: 'medium',
          dueDate
        });
      }

      // During-trip tasks
      for (const template of this.taskTemplates.during_trip) {
        let dueDate;
        
        if (template.daysFromStart === 0) {
          dueDate = startDate;
        } else if (template.daysFromStart === 'mid') {
          dueDate = midTripDate;
        } else {
          dueDate = new Date(startDate.getTime() + template.daysFromStart * 24 * 60 * 60 * 1000);
        }

        tasks.push({
          title: template.title,
          description: template.description,
          status: 'pending',
          priority: 'high',
          dueDate
        });
      }

      // Post-trip tasks
      for (const template of this.taskTemplates.post_trip) {
        const dueDate = new Date(endDate.getTime() + template.daysFromEnd * 24 * 60 * 60 * 1000);

        tasks.push({
          title: template.title,
          description: template.description,
          status: 'pending',
          priority: template.daysFromEnd <= 7 ? 'high' : 'medium',
          dueDate
        });
      }

      // Agregar tasks al project
      const project = await Project.findById(projectId);
      project.tasks = tasks;
      await project.save();

      logger.info('Project tasks created', { 
        projectId, 
        tasksCount: tasks.length 
      });

      return tasks;

    } catch (error) {
      logger.error('Error creating project tasks', { error: error.message });
      throw error;
    }
  }

  /**
   * Crear milestones del project
   */
  async createProjectMilestones(projectId, booking) {
    try {
      const milestones = [];
      const bookingDate = new Date(booking.bookingDate);
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      const now = new Date();

      // Calculate dates for milestones
      const prepDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before
      const followUpDate = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after

      const milestoneDates = [
        { date: bookingDate, index: 0 },
        { date: prepDate, index: 1 },
        { date: startDate, index: 2 },
        { date: endDate, index: 3 },
        { date: followUpDate, index: 4 }
      ];

      milestoneDates.forEach(({ date, index }) => {
        const template = this.milestoneTemplates[index];
        milestones.push({
          name: template.name,
          description: template.description,
          dueDate: date,
          status: date <= now ? 'completed' : 'pending'
        });
      });

      // Agregar milestones al project
      const project = await Project.findById(projectId);
      project.milestones = milestones;
      await project.save();

      logger.info('Project milestones created', { 
        projectId, 
        milestonesCount: milestones.length 
      });

      return milestones;

    } catch (error) {
      logger.error('Error creating milestones', { error: error.message });
      throw error;
    }
  }

  /**
   * Adjuntar documentos del booking al project
   */
  async attachBookingDocuments(projectId, booking, workspaceId) {
    try {
      if (!booking.documents || booking.documents.length === 0) {
        logger.info('No booking documents to attach', { projectId });
        return;
      }

      const project = await Project.findById(projectId);

      for (const doc of booking.documents) {
        // En una implementación real, copiarías el documento al sistema de documentos del CRM
        // Por ahora, solo lo registramos en notas
        logger.info('Booking document noted', { 
          projectId, 
          docType: doc.type, 
          docUrl: doc.url 
        });
      }

      // Agregar nota sobre documentos
      const docList = booking.documents.map(d => `- ${d.type}: ${d.url}`).join('\n');
      project.description += `\n\n**Booking Documents:**\n${docList}`;
      await project.save();

      logger.info('Booking documents attached to project', { 
        projectId, 
        documentsCount: booking.documents.length 
      });

    } catch (error) {
      logger.error('Error attaching documents', { error: error.message });
      throw error;
    }
  }

  /**
   * Inicializar time tracking para el project
   */
  async initializeTimeTracking(projectId, workspaceId) {
    try {
      // Placeholder for time tracking initialization
      // En Sprint 3 se implementará completamente
      
      logger.info('Time tracking initialized for project', { projectId });

    } catch (error) {
      logger.error('Error initializing time tracking', { error: error.message });
    }
  }

  /**
   * Webhook handler para bookings confirmados
   */
  async handleBookingConfirmedWebhook(bookingData, workspaceId) {
    try {
      logger.info('Processing booking confirmed webhook', { 
        bookingNumber: bookingData.bookingNumber,
        workspaceId 
      });

      // Buscar o crear booking
      let booking = await Booking.findOne({ bookingNumber: bookingData.bookingNumber });
      
      if (!booking) {
        booking = await Booking.create(bookingData);
        logger.info('Booking created from webhook', { bookingId: booking._id });
      }

      // Convertir a project si está confirmed
      if (bookingData.status === 'confirmed' && !booking.projectId) {
        const result = await this.convertBookingToProject(booking._id, workspaceId);
        return result;
      }

      return {
        success: true,
        message: 'Booking processed',
        bookingId: booking._id,
        projectCreated: false
      };

    } catch (error) {
      logger.error('Error processing booking webhook', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtener project desde booking
   */
  async getProjectFromBooking(bookingId) {
    try {
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.projectId) {
        return {
          success: false,
          message: 'No project associated with this booking'
        };
      }

      const project = await Project.findById(booking.projectId)
        .populate('client')
        .populate('team.user');

      return {
        success: true,
        project
      };

    } catch (error) {
      logger.error('Error getting project from booking', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper: Generar descripción del project
   */
  generateProjectDescription(booking) {
    return `**Trip Details**
Destination: ${booking.destination}
Trip Type: ${booking.tripType}
Duration: ${this.calculateDuration(booking.startDate, booking.endDate)} days
Travelers: ${booking.numberOfTravelers}

**Dates**
Start: ${new Date(booking.startDate).toLocaleDateString()}
End: ${new Date(booking.endDate).toLocaleDateString()}

**Financial**
Total Value: ${booking.currency} ${booking.totalPrice.toLocaleString()}
Deposit: ${booking.currency} ${(booking.deposit || 0).toLocaleString()}
Balance Due: ${booking.currency} ${((booking.balanceDue) || (booking.totalPrice - (booking.deposit || 0))).toLocaleString()}

**Itinerary**
${booking.itinerary || 'To be confirmed'}

**Special Requests**
${booking.specialRequests || 'None'}

**Booking Reference**
Booking Number: ${booking.bookingNumber}
Booking Date: ${new Date(booking.bookingDate).toLocaleDateString()}`;
  }

  /**
   * Helper: Calcular duración
   */
  calculateDuration(startDate, endDate) {
    const diff = new Date(endDate) - new Date(startDate);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Crear Activity
   */
  async createActivity({ workspaceId, entityType, entityId, type, description, metadata }) {
    try {
      const activity = await Activity.create({
        workspace: workspaceId,
        entityType,
        entityId,
        type,
        description,
        metadata,
        createdAt: new Date()
      });

      return activity;

    } catch (error) {
      logger.error('Error creating activity', { error: error.message });
      throw error;
    }
  }
}

module.exports = BookingToProjectBridge;
