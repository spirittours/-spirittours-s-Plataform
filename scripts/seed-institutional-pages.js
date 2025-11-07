/**
 * Seed Script: Insert 12 Institutional Pages
 * Creates pre-configured pages using the CMS system
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import Page model
const Page = require('../backend/models/cms/Page');

// 12 Institutional Pages Data
const institutionalPages = [
  {
    slug: 'about-us',
    title: 'About Us - Spirit Tours',
    type: 'about',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'About Spirit Tours',
          subheading: 'Discover the world with spirituality and purpose',
          backgroundImage: '/images/about-hero.jpg',
          ctaText: 'Learn More',
          ctaLink: '#our-story',
        },
        settings: {
          height: 'medium',
          textPosition: 'center',
          overlayOpacity: 0.5,
        },
        order: 0,
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h2>Our Story</h2><p>Spirit Tours was founded with a vision to create meaningful travel experiences that connect people with diverse spiritual traditions and sacred sites around the world. For over 15 years, we have been guiding travelers on transformative journeys that combine cultural exploration with spiritual growth.</p><p>Our expert guides and carefully curated itineraries ensure that every trip is not just a vacation, but a profound journey of self-discovery and cultural understanding.</p>',
        },
        settings: {
          alignment: 'left',
          maxWidth: 'medium',
          padding: 'medium',
        },
        order: 1,
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<h2>Our Mission</h2><p>To provide authentic, respectful, and transformative spiritual travel experiences that foster global understanding, personal growth, and cultural appreciation.</p>',
        },
        settings: {
          alignment: 'center',
          maxWidth: 'narrow',
          padding: 'large',
          backgroundColor: '#f3f4f6',
        },
        order: 2,
      },
      {
        id: 'gallery-1',
        type: 'gallery',
        content: {
          title: 'Our Team',
          images: [],
        },
        settings: {
          columns: 4,
          gap: 'medium',
        },
        order: 3,
      },
    ],
    seo: {
      metaTitle: 'About Us - Spirit Tours | Spiritual Travel Experiences',
      metaDescription: 'Learn about Spirit Tours, our mission to provide transformative spiritual travel experiences, and meet our team of expert guides.',
      keywords: ['about spirit tours', 'spiritual travel company', 'travel mission', 'sacred sites'],
    },
  },
  {
    slug: 'contact-us',
    title: 'Contact Us - Spirit Tours',
    type: 'contact',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Contact Us',
          subheading: 'We\'re here to help plan your next spiritual journey',
          backgroundImage: '/images/contact-hero.jpg',
        },
        settings: {
          height: 'small',
          textPosition: 'center',
        },
        order: 0,
      },
      {
        id: 'form-1',
        type: 'form',
        content: {
          title: 'Get in Touch',
          description: 'Fill out the form below and our team will get back to you within 24 hours.',
          submitButtonText: 'Send Message',
          successMessage: 'Thank you! We\'ll be in touch soon.',
          fields: [
            { id: '1', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true },
            { id: '2', type: 'email', label: 'Email', placeholder: 'john@example.com', required: true },
            { id: '3', type: 'tel', label: 'Phone', placeholder: '+1 (555) 123-4567', required: false },
            { id: '4', type: 'select', label: 'Inquiry Type', required: true },
            { id: '5', type: 'textarea', label: 'Message', placeholder: 'Tell us about your travel plans...', required: true },
          ],
        },
        settings: {
          layout: 'stacked',
          submitAction: 'email',
          submitEmail: 'info@spirittours.com',
        },
        order: 1,
      },
    ],
    seo: {
      metaTitle: 'Contact Spirit Tours | Get in Touch',
      metaDescription: 'Contact Spirit Tours for inquiries about spiritual travel packages, custom itineraries, and booking assistance.',
      keywords: ['contact spirit tours', 'travel inquiry', 'booking help'],
    },
  },
  {
    slug: 'our-services',
    title: 'Our Services - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Our Services',
          subheading: 'Comprehensive travel solutions for your spiritual journey',
        },
        order: 0,
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h2>What We Offer</h2><p>Spirit Tours provides end-to-end travel services designed specifically for spiritual and cultural exploration:</p><ul><li><strong>Group Tours:</strong> Join like-minded travelers on expertly guided group journeys</li><li><strong>Private Tours:</strong> Customized itineraries for individuals, families, or private groups</li><li><strong>Pilgrimage Packages:</strong> Sacred site visits with spiritual guides</li><li><strong>Cultural Immersion:</strong> Authentic local experiences and homestays</li><li><strong>Retreat Planning:</strong> Yoga, meditation, and wellness retreats worldwide</li><li><strong>24/7 Support:</strong> Round-the-clock assistance during your travels</li></ul>',
        },
        order: 1,
      },
    ],
    seo: {
      metaTitle: 'Our Services - Spiritual Travel & Tours | Spirit Tours',
      metaDescription: 'Explore our comprehensive spiritual travel services including group tours, private packages, pilgrimages, and cultural immersion experiences.',
      keywords: ['spiritual travel services', 'group tours', 'private tours', 'pilgrimage packages'],
    },
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'FAQ',
          subheading: 'Find answers to common questions about our tours',
        },
        settings: {
          height: 'small',
        },
        order: 0,
      },
      {
        id: 'accordion-1',
        type: 'accordion',
        content: {
          items: [
            {
              id: '1',
              title: 'What is included in the tour price?',
              content: 'Our tour prices typically include accommodation, most meals, transportation during the tour, entrance fees to sites, and guided tours. International flights are usually not included unless specifically mentioned.',
            },
            {
              id: '2',
              title: 'Do I need travel insurance?',
              content: 'Yes, we strongly recommend purchasing comprehensive travel insurance that covers medical emergencies, trip cancellation, and lost luggage. We can provide recommendations for trusted insurance providers.',
            },
            {
              id: '3',
              title: 'What is your cancellation policy?',
              content: 'Cancellations made 90+ days before departure receive a full refund minus a $200 processing fee. 60-89 days: 50% refund. 30-59 days: 25% refund. Less than 30 days: no refund. See our full cancellation policy page for details.',
            },
            {
              id: '4',
              title: 'Are your tours suitable for solo travelers?',
              content: 'Absolutely! Many of our travelers join as solo adventurers. Our group tours provide a supportive environment to meet fellow travelers, and we can also arrange private tours for those preferring individual experiences.',
            },
            {
              id: '5',
              title: 'What level of fitness is required?',
              content: 'Fitness requirements vary by tour. Each tour description includes a fitness level rating from easy (suitable for all) to strenuous (requires good physical condition). Contact us if you have specific concerns about a tour\'s physical demands.',
            },
            {
              id: '6',
              title: 'Can dietary restrictions be accommodated?',
              content: 'Yes, we can accommodate most dietary requirements including vegetarian, vegan, gluten-free, and religious dietary needs. Please inform us of any restrictions when booking.',
            },
          ],
        },
        settings: {
          allowMultiple: false,
          startOpen: false,
          style: 'bordered',
        },
        order: 1,
      },
    ],
    seo: {
      metaTitle: 'FAQ - Spirit Tours | Common Questions About Spiritual Travel',
      metaDescription: 'Find answers to frequently asked questions about Spirit Tours, our booking process, cancellation policies, and what to expect on your spiritual journey.',
      keywords: ['spirit tours faq', 'travel questions', 'tour information'],
    },
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy - Spirit Tours',
    type: 'privacy',
    status: 'published',
    sections: [
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h1>Privacy Policy</h1><p><em>Last updated: November 6, 2025</em></p><h2>1. Information We Collect</h2><p>We collect information you provide directly to us, including:</p><ul><li>Name, email address, phone number</li><li>Billing and payment information</li><li>Travel preferences and requirements</li><li>Passport and visa information (when necessary for travel)</li></ul><h2>2. How We Use Your Information</h2><p>We use the information we collect to:</p><ul><li>Process bookings and payments</li><li>Communicate with you about your travel plans</li><li>Send promotional materials (with your consent)</li><li>Improve our services</li><li>Comply with legal obligations</li></ul><h2>3. Information Sharing</h2><p>We do not sell your personal information. We may share your information with:</p><ul><li>Service providers (hotels, airlines, tour operators)</li><li>Payment processors</li><li>Legal authorities when required by law</li></ul><h2>4. Data Security</h2><p>We implement industry-standard security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.</p><h2>5. Your Rights</h2><p>You have the right to:</p><ul><li>Access your personal information</li><li>Correct inaccurate data</li><li>Request deletion of your data</li><li>Opt-out of marketing communications</li></ul><h2>6. Contact Us</h2><p>For questions about this privacy policy, contact us at: privacy@spirittours.com</p>',
        },
        settings: {
          maxWidth: 'medium',
        },
        order: 0,
      },
    ],
    seo: {
      metaTitle: 'Privacy Policy - Spirit Tours',
      metaDescription: 'Read Spirit Tours\' privacy policy to understand how we collect, use, and protect your personal information.',
      keywords: ['privacy policy', 'data protection', 'personal information'],
    },
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions - Spirit Tours',
    type: 'terms',
    status: 'published',
    sections: [
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h1>Terms and Conditions</h1><p><em>Last updated: November 6, 2025</em></p><h2>1. Booking and Payment</h2><p>A deposit of 25% is required to confirm your booking. Full payment is due 60 days before departure. Failure to make payment may result in cancellation and loss of deposit.</p><h2>2. Travel Documents</h2><p>You are responsible for obtaining valid passports, visas, and any required health certificates. Spirit Tours is not liable for denied entry due to improper documentation.</p><h2>3. Tour Modifications</h2><p>We reserve the right to modify itineraries due to circumstances beyond our control (weather, political situations, etc.). We will provide comparable alternatives when possible.</p><h2>4. Health and Fitness</h2><p>Participants must be in good health and capable of completing tour activities. Inform us of any medical conditions that may affect your travel.</p><h2>5. Liability</h2><p>Spirit Tours acts as an agent for transportation, accommodation, and activity providers. We are not liable for their actions or omissions. Travel insurance is strongly recommended.</p><h2>6. Conduct</h2><p>Participants must respect local customs, laws, and tour leaders\' instructions. We reserve the right to remove disruptive participants from tours without refund.</p><h2>7. Complaints</h2><p>Report any concerns to your tour leader immediately. Post-tour complaints must be submitted in writing within 30 days of tour completion.</p>',
        },
        settings: {
          maxWidth: 'medium',
        },
        order: 0,
      },
    ],
    seo: {
      metaTitle: 'Terms and Conditions - Spirit Tours',
      metaDescription: 'Read Spirit Tours\' terms and conditions including booking policies, payment terms, and traveler responsibilities.',
      keywords: ['terms and conditions', 'booking terms', 'travel policy'],
    },
  },
  {
    slug: 'cancellation-policy',
    title: 'Cancellation Policy - Spirit Tours',
    type: 'policy',
    status: 'published',
    sections: [
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h1>Cancellation Policy</h1><p><em>Effective: November 6, 2025</em></p><h2>Cancellation by Customer</h2><p>All cancellations must be submitted in writing via email to bookings@spirittours.com.</p><h3>Refund Schedule:</h3><ul><li><strong>90+ days before departure:</strong> Full refund minus $200 processing fee</li><li><strong>60-89 days before departure:</strong> 50% refund of total tour cost</li><li><strong>30-59 days before departure:</strong> 25% refund of total tour cost</li><li><strong>Less than 30 days before departure:</strong> No refund</li></ul><h2>Cancellation by Spirit Tours</h2><p>In the rare event we must cancel a tour:</p><ul><li>Full refund of all payments made</li><li>Option to transfer booking to another tour date</li><li>No additional compensation beyond refund</li></ul><h2>Travel Insurance</h2><p>We strongly recommend purchasing comprehensive travel insurance that includes trip cancellation coverage. Insurance may cover cancellations due to:</p><ul><li>Medical emergencies</li><li>Family emergencies</li><li>Natural disasters</li><li>Other covered events</li></ul><h2>Force Majeure</h2><p>Neither party is liable for cancellations or delays caused by events beyond reasonable control, including but not limited to: acts of God, war, terrorism, pandemics, government restrictions, or natural disasters.</p><h2>Questions?</h2><p>Contact our support team: support@spirittours.com or call +1 (555) 123-4567</p>',
        },
        settings: {
          maxWidth: 'medium',
        },
        order: 0,
      },
    ],
    seo: {
      metaTitle: 'Cancellation Policy - Spirit Tours',
      metaDescription: 'Understand Spirit Tours\' cancellation and refund policy for tour bookings.',
      keywords: ['cancellation policy', 'refund policy', 'tour cancellation'],
    },
  },
  {
    slug: 'our-team',
    title: 'Our Team - Spirit Tours',
    type: 'about',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Meet Our Team',
          subheading: 'Expert guides dedicated to your spiritual journey',
        },
        order: 0,
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h2>Leadership Team</h2><p>Our team brings decades of combined experience in spiritual travel, cultural anthropology, and hospitality management.</p>',
        },
        order: 1,
      },
      {
        id: 'gallery-1',
        type: 'gallery',
        content: {
          title: 'Team Members',
          images: [],
        },
        settings: {
          columns: 3,
          gap: 'large',
        },
        order: 2,
      },
    ],
    seo: {
      metaTitle: 'Our Team - Meet the Spirit Tours Guides & Staff',
      metaDescription: 'Meet the expert team behind Spirit Tours - experienced guides and staff dedicated to creating transformative spiritual travel experiences.',
      keywords: ['spirit tours team', 'tour guides', 'travel experts'],
    },
  },
  {
    slug: 'careers',
    title: 'Careers - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Join Our Team',
          subheading: 'Help us create life-changing travel experiences',
          ctaText: 'View Open Positions',
          ctaLink: '#positions',
        },
        order: 0,
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h2>Why Work With Us?</h2><p>At Spirit Tours, we\'re more than just a company - we\'re a community of passionate travelers and cultural enthusiasts. When you join our team, you become part of a mission to make spiritual travel accessible and transformative.</p><h3>Benefits:</h3><ul><li>Competitive salary and commission structure</li><li>Travel opportunities and familiarization trips</li><li>Flexible work arrangements</li><li>Professional development and training</li><li>Health and wellness benefits</li><li>Collaborative and supportive team culture</li></ul>',
        },
        order: 1,
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<h2 id="positions">Current Openings</h2><p>We\'re currently seeking talented individuals for the following positions:</p><ul><li><strong>Tour Guide (Multiple Destinations)</strong> - Lead groups on spiritual journeys worldwide</li><li><strong>Travel Consultant</strong> - Help clients plan their perfect spiritual adventure</li><li><strong>Marketing Specialist</strong> - Promote our tours through digital and traditional channels</li><li><strong>Operations Coordinator</strong> - Manage logistics and supplier relationships</li></ul><p>To apply, please send your resume and cover letter to: careers@spirittours.com</p>',
        },
        order: 2,
      },
    ],
    seo: {
      metaTitle: 'Careers at Spirit Tours | Join Our Team',
      metaDescription: 'Explore career opportunities at Spirit Tours. Join our team of passionate travel professionals creating meaningful spiritual journeys.',
      keywords: ['spirit tours careers', 'travel jobs', 'tour guide jobs'],
    },
  },
  {
    slug: 'blog',
    title: 'Blog - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Spirit Tours Blog',
          subheading: 'Stories, tips, and insights from our travels',
        },
        settings: {
          height: 'small',
        },
        order: 0,
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h2>Latest Articles</h2><p>Welcome to our blog! Here we share travel stories, destination guides, spiritual insights, and practical tips for your journeys. Check back regularly for new content from our team and guest contributors.</p><p><em>Blog posts coming soon...</em></p>',
        },
        order: 1,
      },
    ],
    seo: {
      metaTitle: 'Blog - Spirit Tours | Travel Stories & Insights',
      metaDescription: 'Read the Spirit Tours blog for travel stories, destination guides, spiritual insights, and practical tips for your next journey.',
      keywords: ['spirit tours blog', 'travel stories', 'destination guides'],
    },
  },
  {
    slug: 'press-media',
    title: 'Press & Media - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h1>Press & Media</h1><h2>Media Inquiries</h2><p>For press inquiries, interview requests, or media kits, please contact our communications team:</p><p>Email: press@spirittours.com<br>Phone: +1 (555) 123-4567</p><h2>About Spirit Tours</h2><p>Spirit Tours is a leading provider of spiritual and cultural travel experiences, serving thousands of travelers annually on journeys to sacred sites and destinations worldwide.</p><h2>Recent Press</h2><ul><li><em>Travel Weekly</em> - "Top Spiritual Travel Companies of 2025"</li><li><em>National Geographic Traveler</em> - "Meaningful Travel Experiences"</li><li><em>Conde Nast Traveler</em> - "Best Tour Operators for Sacred Sites"</li></ul><h2>Download Press Kit</h2><p><a href="/media/press-kit.pdf">Download our press kit (PDF)</a></p>',
        },
        settings: {
          maxWidth: 'medium',
        },
        order: 0,
      },
    ],
    seo: {
      metaTitle: 'Press & Media - Spirit Tours',
      metaDescription: 'Media inquiries and press information for Spirit Tours. Download our press kit and learn about recent media coverage.',
      keywords: ['spirit tours press', 'media inquiries', 'press kit'],
    },
  },
  {
    slug: 'partners',
    title: 'Partners & Collaborators - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Our Partners',
          subheading: 'Collaborating with trusted organizations worldwide',
        },
        order: 0,
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h2>Partner Network</h2><p>Spirit Tours works with a carefully selected network of partners to ensure the highest quality experiences for our travelers:</p><ul><li><strong>Local Tour Operators:</strong> Vetted operators in each destination who share our values</li><li><strong>Accommodation Partners:</strong> Hotels, retreats, and guesthouses committed to sustainable tourism</li><li><strong>Spiritual Leaders:</strong> Authentic guides from various traditions</li><li><strong>Transportation Providers:</strong> Reliable and safe travel services</li><li><strong>Cultural Organizations:</strong> Museums, heritage sites, and community groups</li></ul><h2>Become a Partner</h2><p>Interested in partnering with Spirit Tours? We\'re always looking to expand our network of quality service providers. Contact us at: partnerships@spirittours.com</p>',
        },
        order: 1,
      },
    ],
    seo: {
      metaTitle: 'Partners - Spirit Tours Collaborators & Network',
      metaDescription: 'Learn about Spirit Tours\' trusted partner network including local operators, accommodation providers, and cultural organizations.',
      keywords: ['spirit tours partners', 'travel partnerships', 'collaboration'],
    },
  },
];

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spirit-tours';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Insert pages
async function seedPages() {
  try {
    console.log('\n🌱 Starting institutional pages seed...\n');

    for (const pageData of institutionalPages) {
      // Check if page already exists
      const existing = await Page.findOne({ slug: pageData.slug });
      
      if (existing) {
        console.log(`⏭️  Page "${pageData.title}" already exists (slug: ${pageData.slug})`);
        continue;
      }

      // Create new page
      const page = await Page.create({
        ...pageData,
        language: 'en',
        publishedAt: new Date(),
        createdBy: null, // Will be set to admin user if auth is available
        modifiedBy: null,
      });

      console.log(`✅ Created page: "${page.title}" (slug: ${page.slug})`);
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Total pages processed: ${institutionalPages.length}`);
    
    const allPages = await Page.find();
    console.log(`   Total pages in database: ${allPages.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding pages:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDB();
    await seedPages();
    
    console.log('\n✨ All done! The 12 institutional pages have been created.');
    console.log('\nYou can now view them in the CMS at: /admin/cms/pages\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { institutionalPages, seedPages };
