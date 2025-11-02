import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchTourById } from '../store/slices/toursSlice';
import { createBooking } from '../store/slices/bookingsSlice';
import { Button, Input, Card } from '../components/UI';

interface Participant {
  name: string;
  age: string;
  type: 'adult' | 'child' | 'infant';
}

const BookingPage: React.FC = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const { currentTour, loading: tourLoading } = useSelector((state: RootState) => state.tours);
  const { loading: bookingLoading } = useSelector((state: RootState) => state.bookings);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    tourDate: '',
    numberOfAdults: 1,
    numberOfChildren: 0,
    numberOfInfants: 0,
    specialRequirements: '',
  });
  
  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', age: '', type: 'adult' },
  ]);
  
  useEffect(() => {
    if (tourId) {
      dispatch(fetchTourById(Number(tourId)));
    }
  }, [dispatch, tourId]);
  
  useEffect(() => {
    const total = formData.numberOfAdults + formData.numberOfChildren + formData.numberOfInfants;
    const newParticipants: Participant[] = [];
    
    for (let i = 0; i < formData.numberOfAdults; i++) {
      newParticipants.push({ name: participants[i]?.name || '', age: participants[i]?.age || '', type: 'adult' });
    }
    for (let i = 0; i < formData.numberOfChildren; i++) {
      const index = formData.numberOfAdults + i;
      newParticipants.push({ name: participants[index]?.name || '', age: participants[index]?.age || '', type: 'child' });
    }
    for (let i = 0; i < formData.numberOfInfants; i++) {
      const index = formData.numberOfAdults + formData.numberOfChildren + i;
      newParticipants.push({ name: participants[index]?.name || '', age: participants[index]?.age || '', type: 'infant' });
    }
    
    setParticipants(newParticipants);
  }, [formData.numberOfAdults, formData.numberOfChildren, formData.numberOfInfants]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name.includes('number') ? Number(value) : value });
  };
  
  const handleParticipantChange = (index: number, field: string, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setParticipants(newParticipants);
  };
  
  const calculateTotal = () => {
    if (!currentTour) return 0;
    const price = currentTour.discounted_price || currentTour.price;
    return (formData.numberOfAdults * price) + 
           (formData.numberOfChildren * price * 0.7) + 
           (formData.numberOfInfants * price * 0.3);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tourId) return;
    
    const bookingData = {
      tour_id: Number(tourId),
      tour_date: formData.tourDate,
      number_of_adults: formData.numberOfAdults,
      number_of_children: formData.numberOfChildren,
      number_of_infants: formData.numberOfInfants,
      participants: participants.map(p => ({
        name: p.name,
        age: Number(p.age),
        type: p.type,
      })),
      special_requirements: formData.specialRequirements,
    };
    
    const result = await dispatch(createBooking(bookingData));
    
    if (createBooking.fulfilled.match(result)) {
      navigate(`/booking/confirmation/${result.payload.id}`);
    }
  };
  
  if (tourLoading || !currentTour) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Booking</h1>
          <p className="text-gray-600">{currentTour.title}</p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step >= s ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-4 ${step > s ? 'bg-blue-600' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm text-gray-600">Date & Participants</span>
            <span className="text-sm text-gray-600">Participant Details</span>
            <span className="text-sm text-gray-600">Review & Pay</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card padding="lg">
              <form onSubmit={handleSubmit}>
                {/* Step 1: Date and Participants */}
                {step === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Date and Number of Travelers</h2>
                    
                    <Input
                      type="date"
                      name="tourDate"
                      label="Tour Date"
                      value={formData.tourDate}
                      onChange={handleInputChange}
                      required
                      fullWidth
                      min={new Date().toISOString().split('T')[0]}
                    />
                    
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        type="number"
                        name="numberOfAdults"
                        label="Adults"
                        helperText="Age 13+"
                        value={formData.numberOfAdults}
                        onChange={handleInputChange}
                        min="1"
                        required
                        fullWidth
                      />
                      
                      <Input
                        type="number"
                        name="numberOfChildren"
                        label="Children"
                        helperText="Age 2-12"
                        value={formData.numberOfChildren}
                        onChange={handleInputChange}
                        min="0"
                        fullWidth
                      />
                      
                      <Input
                        type="number"
                        name="numberOfInfants"
                        label="Infants"
                        helperText="Under 2"
                        value={formData.numberOfInfants}
                        onChange={handleInputChange}
                        min="0"
                        fullWidth
                      />
                    </div>
                    
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      fullWidth
                      size="lg"
                      disabled={!formData.tourDate}
                    >
                      Continue to Participant Details
                    </Button>
                  </div>
                )}
                
                {/* Step 2: Participant Details */}
                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Participant Information</h2>
                    
                    {participants.map((participant, index) => (
                      <Card key={index} padding="md" className="bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                          {participant.type === 'adult' ? 'Adult' : participant.type === 'child' ? 'Child' : 'Infant'} {index + 1}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            type="text"
                            label="Full Name"
                            value={participant.name}
                            onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                            required
                            fullWidth
                          />
                          <Input
                            type="number"
                            label="Age"
                            value={participant.age}
                            onChange={(e) => handleParticipantChange(index, 'age', e.target.value)}
                            required
                            fullWidth
                            min="0"
                          />
                        </div>
                      </Card>
                    ))}
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Special Requirements (Optional)
                      </label>
                      <textarea
                        name="specialRequirements"
                        value={formData.specialRequirements}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Dietary restrictions, accessibility needs, etc."
                      />
                    </div>
                    
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        fullWidth
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setStep(3)}
                        fullWidth
                        disabled={participants.some(p => !p.name || !p.age)}
                      >
                        Continue to Review
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Step 3: Review and Confirm */}
                {step === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Review Your Booking</h2>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Tour Date</span>
                        <span className="font-semibold">{new Date(formData.tourDate).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Number of Travelers</span>
                        <span className="font-semibold">
                          {formData.numberOfAdults + formData.numberOfChildren + formData.numberOfInfants}
                        </span>
                      </div>
                      
                      {participants.map((p, i) => (
                        <div key={i} className="flex justify-between py-2">
                          <span className="text-gray-600">{p.type.charAt(0).toUpperCase() + p.type.slice(1)} {i + 1}</span>
                          <span className="font-semibold">{p.name}, Age {p.age}</span>
                        </div>
                      ))}
                      
                      {formData.specialRequirements && (
                        <div className="py-2 border-t">
                          <span className="text-gray-600 block mb-2">Special Requirements:</span>
                          <p className="text-sm text-gray-800">{formData.specialRequirements}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(2)}
                        fullWidth
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        fullWidth
                        loading={bookingLoading}
                      >
                        Proceed to Payment
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Card>
          </div>
          
          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card padding="lg" className="sticky top-24">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Booking Summary</h3>
              
              <div className="mb-6">
                <img
                  src={currentTour.featured_image_url || 'https://via.placeholder.com/400x200'}
                  alt={currentTour.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <h4 className="font-semibold text-gray-800">{currentTour.title}</h4>
                <p className="text-sm text-gray-600">{currentTour.location}</p>
              </div>
              
              <div className="space-y-3 mb-6">
                {formData.numberOfAdults > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Adults × {formData.numberOfAdults}</span>
                    <span className="font-semibold">
                      ${((currentTour.discounted_price || currentTour.price) * formData.numberOfAdults).toFixed(2)}
                    </span>
                  </div>
                )}
                
                {formData.numberOfChildren > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Children × {formData.numberOfChildren}</span>
                    <span className="font-semibold">
                      ${((currentTour.discounted_price || currentTour.price) * 0.7 * formData.numberOfChildren).toFixed(2)}
                    </span>
                  </div>
                )}
                
                {formData.numberOfInfants > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Infants × {formData.numberOfInfants}</span>
                    <span className="font-semibold">
                      ${((currentTour.discounted_price || currentTour.price) * 0.3 * formData.numberOfInfants).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Free cancellation up to 24 hours
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Instant confirmation
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Mobile ticket accepted
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
