import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { updateProfile, changePassword } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { Card, Button, Input, Modal, Badge } from '../components/UI';

const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    country: user?.country || '',
    postal_code: user?.postal_code || '',
    date_of_birth: user?.date_of_birth || '',
    preferred_language: user?.preferred_language || 'en',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateProfile = () => {
    const newErrors: Record<string, string> = {};
    
    if (!profileData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!profileData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (profileData.phone && !/^\+?[\d\s-()]+$/.test(profileData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.current_password) {
      newErrors.current_password = 'Current password is required';
    }
    if (!passwordData.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters';
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    setIsSaving(true);
    try {
      await dispatch(updateProfile(profileData)).unwrap();
      dispatch(addToast({
        message: 'Profile updated successfully!',
        type: 'success'
      }));
      setIsEditingProfile(false);
    } catch (error: any) {
      dispatch(addToast({
        message: error.message || 'Failed to update profile',
        type: 'error'
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setIsSaving(true);
    try {
      await dispatch(changePassword({
        currentPassword: passwordData.current_password,
        newPassword: passwordData.new_password,
      })).unwrap();
      dispatch(addToast({
        message: 'Password changed successfully!',
        type: 'success'
      }));
      setIsChangingPassword(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error: any) {
      dispatch(addToast({
        message: error.message || 'Failed to change password',
        type: 'error'
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    return `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            My Profile
          </h1>
          <p className="text-gray-600">
            Manage your personal information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Summary Card */}
          <Card className="lg:col-span-1" padding="lg">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
                {getInitials()}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                {user?.first_name} {user?.last_name}
              </h2>
              <p className="text-gray-600 mb-4">{user?.email}</p>
              
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <Badge variant={user?.is_verified ? 'success' : 'warning'}>
                  {user?.is_verified ? 'Verified' : 'Unverified'}
                </Badge>
                <Badge variant="info" className="capitalize">
                  {user?.role}
                </Badge>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit Profile
                </Button>
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  variant="outline"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Change Password
                </Button>
              </div>
            </div>
          </Card>

          {/* Profile Details Card */}
          <Card className="lg:col-span-2" padding="lg">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  First Name
                </label>
                <p className="text-gray-800">{user?.first_name || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Last Name
                </label>
                <p className="text-gray-800">{user?.last_name || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-gray-800">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone
                </label>
                <p className="text-gray-800">{user?.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date of Birth
                </label>
                <p className="text-gray-800">
                  {user?.date_of_birth 
                    ? new Date(user.date_of_birth).toLocaleDateString()
                    : 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Preferred Language
                </label>
                <p className="text-gray-800 capitalize">{user?.preferred_language || 'English'}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Street Address
                  </label>
                  <p className="text-gray-800">{user?.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    City
                  </label>
                  <p className="text-gray-800">{user?.city || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Country
                  </label>
                  <p className="text-gray-800">{user?.country || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <p className="text-gray-800">{user?.postal_code || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Account Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Member Since
                  </label>
                  <p className="text-gray-800">
                    {user?.created_at 
                      ? new Date(user.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Last Updated
                  </label>
                  <p className="text-gray-800">
                    {user?.updated_at 
                      ? new Date(user.updated_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <Card className="text-center" padding="md">
            <div className="text-3xl font-bold text-blue-600 mb-1">0</div>
            <p className="text-gray-600">Total Bookings</p>
          </Card>
          <Card className="text-center" padding="md">
            <div className="text-3xl font-bold text-green-600 mb-1">0</div>
            <p className="text-gray-600">Completed Tours</p>
          </Card>
          <Card className="text-center" padding="md">
            <div className="text-3xl font-bold text-purple-600 mb-1">0</div>
            <p className="text-gray-600">Reviews Written</p>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditingProfile}
        onClose={() => setIsEditingProfile(false)}
        title="Edit Profile"
        size="lg"
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="first_name"
              value={profileData.first_name}
              onChange={handleProfileChange}
              error={errors.first_name}
              fullWidth
            />
            <Input
              label="Last Name"
              name="last_name"
              value={profileData.last_name}
              onChange={handleProfileChange}
              error={errors.last_name}
              fullWidth
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={profileData.email}
              onChange={handleProfileChange}
              error={errors.email}
              fullWidth
            />
            <Input
              label="Phone"
              name="phone"
              value={profileData.phone}
              onChange={handleProfileChange}
              error={errors.phone}
              fullWidth
            />
            <Input
              label="Date of Birth"
              name="date_of_birth"
              type="date"
              value={profileData.date_of_birth}
              onChange={handleProfileChange}
              fullWidth
            />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Preferred Language
              </label>
              <select
                name="preferred_language"
                value={profileData.preferred_language}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold text-gray-800 mb-4">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Street Address"
                name="address"
                value={profileData.address}
                onChange={handleProfileChange}
                fullWidth
                className="md:col-span-2"
              />
              <Input
                label="City"
                name="city"
                value={profileData.city}
                onChange={handleProfileChange}
                fullWidth
              />
              <Input
                label="Country"
                name="country"
                value={profileData.country}
                onChange={handleProfileChange}
                fullWidth
              />
              <Input
                label="Postal Code"
                name="postal_code"
                value={profileData.postal_code}
                onChange={handleProfileChange}
                fullWidth
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSaveProfile}
              loading={isSaving}
              disabled={isSaving}
              className="flex-1"
            >
              Save Changes
            </Button>
            <Button
              onClick={() => setIsEditingProfile(false)}
              variant="outline"
              disabled={isSaving}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={isChangingPassword}
        onClose={() => setIsChangingPassword(false)}
        title="Change Password"
        size="sm"
      >
        <div className="space-y-4 py-4">
          <Input
            label="Current Password"
            name="current_password"
            type="password"
            value={passwordData.current_password}
            onChange={handlePasswordChange}
            error={errors.current_password}
            fullWidth
          />
          <Input
            label="New Password"
            name="new_password"
            type="password"
            value={passwordData.new_password}
            onChange={handlePasswordChange}
            error={errors.new_password}
            helperText="Must be at least 8 characters"
            fullWidth
          />
          <Input
            label="Confirm New Password"
            name="confirm_password"
            type="password"
            value={passwordData.confirm_password}
            onChange={handlePasswordChange}
            error={errors.confirm_password}
            fullWidth
          />

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleChangePassword}
              loading={isSaving}
              disabled={isSaving}
              className="flex-1"
            >
              Change Password
            </Button>
            <Button
              onClick={() => setIsChangingPassword(false)}
              variant="outline"
              disabled={isSaving}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
