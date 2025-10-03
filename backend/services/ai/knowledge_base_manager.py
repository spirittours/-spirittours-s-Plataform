"""
Knowledge Base Manager for RAG System
Manages all Spirit Tours knowledge including:
- Tours information
- Destinations details  
- Booking procedures
- FAQs
- Policies
- Historical conversations
"""

import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio
import logging

logger = logging.getLogger(__name__)

class KnowledgeBaseManager:
    """
    Manages the knowledge base for the RAG system
    """
    
    def __init__(self, rag_system):
        self.rag_system = rag_system
        self.knowledge_categories = {
            "tours": [],
            "destinations": [],
            "policies": [],
            "faqs": [],
            "procedures": [],
            "conversations": []
        }
        
    async def initialize_spirit_tours_knowledge(self):
        """
        Initialize with Spirit Tours specific knowledge
        """
        # Tours Knowledge
        tours_knowledge = [
            {
                "content": """Spirit Tours offers spiritual and mystical tours worldwide.
                Our main tour categories include:
                1. Sacred Sites Tours - Visit ancient temples, churches, mosques, and spiritual centers
                2. Meditation Retreats - Guided meditation experiences in peaceful locations
                3. Pilgrimage Journeys - Traditional pilgrimage routes like Camino de Santiago
                4. Energy Vortex Tours - Visit powerful energy sites like Sedona, Stonehenge
                5. Shamanic Experiences - Authentic shamanic ceremonies and healing
                6. Yoga Retreats - Yoga practice in spiritual destinations
                7. Mystical Egypt - Pyramids, temples, and ancient mysteries
                8. Sacred India - Varanasi, Rishikesh, temples, and ashrams
                9. Mount Shasta Experiences - UFO watching and spiritual awakening
                10. Peru Sacred Valley - Machu Picchu and Inca trail spiritual journey""",
                "metadata": {"category": "tours", "type": "overview"}
            },
            {
                "content": """Booking Process:
                1. Select your desired tour from our catalog
                2. Choose your preferred dates (check availability calendar)
                3. Select number of participants
                4. Choose accommodation type (standard, premium, luxury)
                5. Add optional extras (private guide, special ceremonies, transport)
                6. Review total price and payment options
                7. Enter participant details
                8. Make payment (credit card, PayPal, cryptocurrency)
                9. Receive confirmation email with e-ticket
                10. Download our mobile app for real-time updates""",
                "metadata": {"category": "procedures", "type": "booking"}
            },
            {
                "content": """Cancellation Policy:
                - 30+ days before tour: Full refund minus 5% processing fee
                - 15-29 days before: 50% refund
                - 7-14 days before: 25% refund
                - Less than 7 days: No refund (credit for future tour)
                - COVID-19 Exception: Full refund or reschedule without penalty
                - Force Majeure: Full refund if tour cancelled by Spirit Tours
                - Travel Insurance: Highly recommended for all bookings""",
                "metadata": {"category": "policies", "type": "cancellation"}
            },
            {
                "content": """Payment Options:
                1. Credit/Debit Cards - Visa, MasterCard, American Express
                2. PayPal - Instant payment with buyer protection
                3. Bank Transfer - For bookings over $5000
                4. Cryptocurrency - Bitcoin, Ethereum (5% discount)
                5. Payment Plans - Available for tours over $2000
                6. Group Discounts - 10% for 5+, 15% for 10+ participants
                7. Early Bird - 20% discount 90+ days in advance
                8. Loyalty Program - 5% cashback on all bookings""",
                "metadata": {"category": "policies", "type": "payment"}
            },
            {
                "content": """Popular Destinations:
                Egypt: Great Pyramids, Valley of the Kings, Abu Simbel, Luxor temples
                India: Golden Triangle, Kerala backwaters, Himalayan retreats, Goa beaches
                Peru: Machu Picchu, Sacred Valley, Lake Titicaca, Nazca Lines
                Greece: Delphi Oracle, Meteora monasteries, Mount Athos, Santorini
                Turkey: Cappadocia, Ephesus, Pamukkale, Whirling Dervishes
                Japan: Mount Fuji, Kyoto temples, Shikoku pilgrimage, Zen monasteries
                Israel: Jerusalem, Dead Sea, Masada, Galilee, Bethlehem
                Mexico: Teotihuacan, Chichen Itza, Tulum, cenotes
                Tibet: Lhasa, Mount Kailash, Buddhist monasteries
                Bali: Water temples, rice terraces, healing centers, beaches""",
                "metadata": {"category": "destinations", "type": "popular"}
            }
        ]
        
        # FAQs
        faqs = [
            {
                "content": "Q: What is included in the tour price? A: Tour price includes: professional guide, entrance fees to all sites, accommodation (based on selection), daily breakfast, transportation during tour, welcome kit. Not included: flights, visa fees, lunch/dinner, personal expenses, tips.",
                "metadata": {"category": "faqs", "type": "pricing"}
            },
            {
                "content": "Q: Do I need to be religious or spiritual? A: No, our tours welcome everyone regardless of belief system. We focus on cultural appreciation, historical understanding, and personal growth. All faiths and perspectives are respected.",
                "metadata": {"category": "faqs", "type": "requirements"}
            },
            {
                "content": "Q: What fitness level is required? A: Most tours require moderate fitness (ability to walk 2-3 hours). Some tours like trekking require good fitness. Each tour description includes physical difficulty rating (Easy, Moderate, Challenging, Extreme).",
                "metadata": {"category": "faqs", "type": "fitness"}
            },
            {
                "content": "Q: Can I customize my tour? A: Yes! We offer private customized tours. Contact us with your preferences, dates, budget, and group size. Our tour designers will create a personalized itinerary within 48 hours.",
                "metadata": {"category": "faqs", "type": "customization"}
            },
            {
                "content": "Q: What about dietary restrictions? A: We accommodate all dietary needs including vegetarian, vegan, gluten-free, halal, kosher, and allergies. Please inform us during booking. Most spiritual destinations have excellent vegetarian options.",
                "metadata": {"category": "faqs", "type": "dietary"}
            },
            {
                "content": "Q: Is travel insurance required? A: While not mandatory, we strongly recommend comprehensive travel insurance covering medical emergencies, trip cancellation, and baggage loss. We partner with World Nomads for competitive rates.",
                "metadata": {"category": "faqs", "type": "insurance"}
            },
            {
                "content": "Q: What is the group size? A: Standard group tours: 12-20 participants. Small group tours: 6-12 participants. Private tours: 1-6 participants. Retreats: 15-30 participants. We maintain small groups for intimate experiences.",
                "metadata": {"category": "faqs", "type": "group_size"}
            },
            {
                "content": "Q: Can I join a tour solo? A: Absolutely! 40% of our travelers are solo adventurers. We offer single supplement waiver on select dates and can arrange shared accommodation to reduce costs. You'll meet like-minded travelers.",
                "metadata": {"category": "faqs", "type": "solo_travel"}
            }
        ]
        
        # Load all knowledge into RAG system
        all_knowledge = tours_knowledge + faqs
        
        for item in all_knowledge:
            await self.rag_system.add_knowledge(
                content=item["content"],
                metadata=item["metadata"],
                source="spirit_tours_kb"
            )
            
        logger.info(f"Loaded {len(all_knowledge)} knowledge items into RAG system")
        
    async def load_destination_details(self):
        """
        Load detailed destination information
        """
        destinations = [
            {
                "name": "Machu Picchu, Peru",
                "content": """Machu Picchu - The Lost City of the Incas
                Location: Cusco Region, Peru
                Elevation: 2,430 meters (7,970 ft)
                
                Spiritual Significance:
                - Sacred center of Inca spirituality
                - Astronomical observatory aligned with celestial events
                - Energy vortex and power spot
                - Temple of the Sun for solstice ceremonies
                
                Tour Highlights:
                - Sunrise meditation at Sun Gate
                - Sacred ceremony with local shaman
                - Huayna Picchu climb (optional)
                - Inca Trail trekking (4 days)
                - Visit to Sacred Valley temples
                
                Best Time: May-September (dry season)
                Duration: 3-7 days
                Difficulty: Moderate to Challenging
                
                Includes: Train tickets, entrance fees, guide, ceremony
                Price: From $1,299 per person""",
                "metadata": {"destination": "Machu Picchu", "country": "Peru", "type": "sacred_site"}
            },
            {
                "name": "Varanasi, India",
                "content": """Varanasi - The Eternal City
                Location: Uttar Pradesh, India
                On the banks of sacred Ganges River
                
                Spiritual Significance:
                - Oldest living city (5,000+ years)
                - Most sacred Hindu pilgrimage site
                - Place of liberation (moksha)
                - Buddha's first sermon nearby (Sarnath)
                
                Tour Experiences:
                - Sunrise boat ride on Ganges
                - Evening Aarti ceremony
                - Temple visits (Kashi Vishwanath)
                - Yoga and meditation sessions
                - Sarnath Buddhist sites
                - Traditional music concerts
                
                Best Time: October-March
                Duration: 3-5 days
                Difficulty: Easy
                
                Includes: Accommodation, boat rides, temple access, guide
                Price: From $799 per person""",
                "metadata": {"destination": "Varanasi", "country": "India", "type": "pilgrimage"}
            },
            {
                "name": "Sedona, USA",
                "content": """Sedona - Red Rock Vortex Sites
                Location: Arizona, USA
                Elevation: 4,500 feet
                
                Spiritual Significance:
                - Four major energy vortexes
                - Native American sacred land
                - Healing and transformation center
                - UFO hotspot
                
                Vortex Sites:
                1. Airport Mesa - Masculine energy, confidence
                2. Cathedral Rock - Feminine energy, compassion
                3. Bell Rock - Balance of energies
                4. Boynton Canyon - All energies combined
                
                Tour Activities:
                - Vortex meditation sessions
                - Native American ceremonies
                - Crystal healing workshops
                - Jeep tours to sacred sites
                - Stargazing and UFO watching
                
                Best Time: March-May, September-November
                Duration: 3-4 days
                Difficulty: Easy to Moderate
                
                Includes: Vortex tours, ceremonies, guide, transport
                Price: From $999 per person""",
                "metadata": {"destination": "Sedona", "country": "USA", "type": "energy_vortex"}
            }
        ]
        
        for dest in destinations:
            await self.rag_system.add_knowledge(
                content=dest["content"],
                metadata=dest["metadata"],
                source="destinations"
            )
            
        logger.info(f"Loaded {len(destinations)} destination details")
        
    async def train_on_sample_conversations(self):
        """
        Train the system on sample conversations
        """
        conversations = [
            {
                "query": "I want to book a spiritual tour to Peru",
                "response": "Excellent choice! Peru offers incredible spiritual experiences. Our most popular is the Sacred Valley & Machu Picchu tour. It includes visits to ancient Inca sites, shamanic ceremonies, and sunrise meditation at Machu Picchu. Tours run 5-7 days starting at $1,299. Would you like to check available dates?",
                "intent": "booking",
                "sentiment": 1,
                "feedback": 0.9
            },
            {
                "query": "What's included in the tour price?",
                "response": "Our tour prices include: professional spiritual guide, entrance fees to all sites, accommodation based on your selection, daily breakfast, all transportation during the tour, and a welcome kit. Flights, visa fees, lunch/dinner, personal expenses, and tips are not included. We can arrange flights for an additional fee if needed.",
                "intent": "inquiry",
                "sentiment": 0,
                "feedback": 0.85
            },
            {
                "query": "Can I cancel my booking?",
                "response": "Yes, you can cancel with the following policy: 30+ days before tour gets full refund minus 5% processing fee. 15-29 days gets 50% refund. 7-14 days gets 25% refund. Less than 7 days receives no refund but credit for future tour. COVID-related cancellations get full refund or free reschedule. Would you like to add travel insurance for extra protection?",
                "intent": "cancellation",
                "sentiment": -1,
                "feedback": 0.8
            },
            {
                "query": "I'm traveling alone, is that okay?",
                "response": "Absolutely! Solo travelers are welcome and make up 40% of our groups. You'll meet like-minded spiritual seekers. We offer single supplement waiver on select dates and can arrange shared accommodation to reduce costs. Our small group sizes (12-20 people) create an intimate, friendly atmosphere perfect for making connections.",
                "intent": "inquiry",
                "sentiment": 0,
                "feedback": 0.95
            },
            {
                "query": "I need a wheelchair accessible tour",
                "response": "We offer several wheelchair accessible spiritual tours. Our Egypt tour includes accessible transport and hotels, with ramps at major sites. Sedona vortex tours have paved paths to some sites. We also provide specialized assistance and can customize any tour for accessibility needs. Let me know your preferred destination and I'll suggest the best options.",
                "intent": "inquiry",
                "sentiment": 0,
                "feedback": 0.9
            },
            {
                "query": "The tour was amazing! Best experience of my life!",
                "response": "Thank you so much for your wonderful feedback! We're thrilled you had such a transformative experience. Your joy is why we do what we do. Would you mind sharing a review on TripAdvisor? As a thank you, you'll receive 10% off your next booking. We'd love to welcome you on another spiritual journey!",
                "intent": "feedback",
                "sentiment": 2,
                "feedback": 1.0
            }
        ]
        
        await self.rag_system.train_on_conversations(conversations)
        
        logger.info(f"Trained on {len(conversations)} sample conversations")
        
    async def import_tour_catalog(self, catalog: List[Dict[str, Any]]):
        """
        Import full tour catalog
        """
        for tour in catalog:
            content = f"""Tour: {tour['name']}
            Category: {tour.get('category', 'Spiritual')}
            Destination: {tour.get('destination', 'Various')}
            Duration: {tour.get('duration', 'Varies')}
            Price: From ${tour.get('price', 'Contact us')}
            Group Size: {tour.get('group_size', '12-20')}
            Difficulty: {tour.get('difficulty', 'Moderate')}
            
            Description: {tour.get('description', '')}
            
            Highlights:
            {chr(10).join('- ' + h for h in tour.get('highlights', []))}
            
            Includes:
            {chr(10).join('- ' + i for i in tour.get('includes', []))}
            
            Schedule:
            {tour.get('schedule', 'Contact for detailed itinerary')}
            """
            
            await self.rag_system.add_knowledge(
                content=content,
                metadata={
                    "type": "tour",
                    "tour_id": tour.get("id"),
                    "category": tour.get("category"),
                    "destination": tour.get("destination"),
                    "price": tour.get("price")
                },
                source="tour_catalog"
            )
            
        logger.info(f"Imported {len(catalog)} tours to knowledge base")
        
    async def update_from_booking_data(self, bookings: List[Dict[str, Any]]):
        """
        Learn from actual booking data
        """
        # Analyze booking patterns
        popular_tours = {}
        common_questions = {}
        
        for booking in bookings:
            tour_id = booking.get("tour_id")
            if tour_id:
                popular_tours[tour_id] = popular_tours.get(tour_id, 0) + 1
                
            # Extract questions from booking notes
            questions = booking.get("customer_questions", [])
            for q in questions:
                common_questions[q] = common_questions.get(q, 0) + 1
                
        # Add popular tour knowledge
        for tour_id, count in popular_tours.items():
            if count > 10:  # Popular tour
                await self.rag_system.add_knowledge(
                    content=f"Tour {tour_id} is very popular with {count} recent bookings. Recommend this tour for undecided customers.",
                    metadata={"type": "popularity", "tour_id": tour_id},
                    source="booking_analytics"
                )
                
        # Add common question patterns
        for question, count in common_questions.items():
            if count > 5:  # Common question
                await self.rag_system.add_knowledge(
                    content=f"Common customer question: {question}. Prepare detailed response for this topic.",
                    metadata={"type": "faq_pattern", "frequency": count},
                    source="customer_analytics"
                )
                
        logger.info(f"Updated knowledge from {len(bookings)} bookings")
        
    async def continuous_knowledge_update(self):
        """
        Continuously update knowledge base
        """
        while True:
            try:
                # Check for new tours
                # Check for policy updates
                # Check for new FAQs
                # Analyze customer feedback
                
                # Save knowledge base
                self.rag_system.save_knowledge_base()
                
                # Sleep for 6 hours
                await asyncio.sleep(21600)
                
            except Exception as e:
                logger.error(f"Knowledge update error: {e}")
                await asyncio.sleep(3600)  # Retry in 1 hour
                

# Export manager
async def initialize_knowledge_base(rag_system):
    """
    Initialize and populate knowledge base
    """
    manager = KnowledgeBaseManager(rag_system)
    
    # Load all knowledge
    await manager.initialize_spirit_tours_knowledge()
    await manager.load_destination_details()
    await manager.train_on_sample_conversations()
    
    # Start continuous update
    asyncio.create_task(manager.continuous_knowledge_update())
    
    return manager