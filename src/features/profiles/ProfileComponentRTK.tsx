import React, { useState, useEffect, forwardRef } from 'react';
import { Upload, X, LogOut, Users, Globe, Check, Loader2, Trash } from 'lucide-react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import GroupCreateModal from '@/shared/ui/GroupCreateModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { 
  useGetCurrentUserQuery, 
  useUpdateUserMutation, 
  useLogoutMutation,
  useDeleteAccountMutation
} from '@/app/api/messengerApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface AvatarPreviewModalProps {
  imageUrl: string;
  onConfirm: () => void;
  onCancel: () => void;
  isUploading?: boolean;
}

// Avatar Preview Modal Component
const AvatarPreviewModal: React.FC<AvatarPreviewModalProps> = ({ 
  imageUrl, 
  onConfirm, 
  onCancel, 
  isUploading 
}) => {
  const { translations } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">{translations.previewProfilePicture}</h3>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-blue-500">
            <img src={imageUrl} alt="Avatar preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onConfirm}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Confirm</span>
            </button>
            <button
              onClick={onCancel}
              disabled={isUploading}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProfileComponentRTKProps {
  username: string;
  onClose: () => void;
  onLogout: () => void;
}

const ProfileComponentRTK = forwardRef<HTMLDivElement, ProfileComponentRTKProps>(({ 
  username, 
  onClose, 
  onLogout 
}, ref) => {
  // RTK Query hooks
  const { 
    data: userData, 
    error: userError, 
    isLoading: isLoadingUser 
  } = useGetCurrentUserQuery();
  
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();

  // Local state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bio, setBio] = useState('');
  const [newBio, setNewBio] = useState('');
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [modal, setModal] = useState<{
    type: 'logout' | 'deleteAccount' | 'success' | 'error';
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  const { translations, language, setLanguage } = useLanguage();
  const token = localStorage.getItem('access_token');

  // Initialize component visibility and bio
  useEffect(() => {
    setIsVisible(true);
    if (userData) {
      setBio(userData.bio || ''); // Use bio from userData
      setNewBio(userData.bio || '');
    }
  }, [userData]);

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    if (!avatarFile || !userData) return;

    setIsUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', avatarFile);

      // Use the correct avatar upload endpoint
      const response = await fetch(`${BASE_URL}/auth/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setModal({
          type: 'success',
          message: 'Avatar updated successfully',
        });
      } else {
        throw new Error('Failed to upload avatar');
      }
      
      setPreviewUrl(null);
      setAvatarFile(null);
    } catch (error: any) {
      setModal({
        type: 'error',
        message: error?.message || 'Failed to update avatar',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle bio update
  const handleUpdateBio = async () => {
    if (!userData || newBio === bio) return;

    setIsUpdatingBio(true);
    try {
      // Use the correct bio update endpoint
      const response = await fetch(`${BASE_URL}/auth/me/bio`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: newBio }),
      });

      if (response.ok) {
        setBio(newBio);
        setModal({
          type: 'success',
          message: 'Bio updated successfully',
        });
      } else {
        throw new Error('Failed to update bio');
      }
    } catch (error: any) {
      setModal({
        type: 'error',
        message: error?.message || 'Failed to update bio',
      });
    } finally {
      setIsUpdatingBio(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setModal({
      type: 'logout',
      message: translations.logoutConfirm,
      onConfirm: async () => {
        try {
          await logout().unwrap();
        } catch (error) {
          // Continue with local logout even if API fails
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        onLogout();
      },
    });
  };

  // Handle delete account
  const handleDeleteAccount = () => {
    setModal({
      type: 'deleteAccount',
      message: translations.deleteAccountConfirm,
      onConfirm: async () => {
        try {
          await deleteAccount().unwrap();
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          onLogout(); // This will redirect to login
        } catch (error: any) {
          setModal({
            type: 'error',
            message: error?.data?.detail || 'Failed to delete account',
          });
        }
      },
    });
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  if (isLoadingUser) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{translations.loading}</span>
        </div>
      </div>
    );
  }

  if (userError || !userData) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <p className="text-red-500 mb-4">Failed to load profile</p>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = userData?.avatar_url 
    ? `${BASE_URL}${userData.avatar_url}` 
    : DEFAULT_AVATAR;

  return (
    <div
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className={`fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div
        ref={ref}
        className={`bg-white w-full max-w-md p-6 rounded-lg shadow-lg border border-gray-200 relative transform transition-all duration-200 ease-out ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">{translations.profile}</h2>
          
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={avatarUrl}
                alt={userData.username}
                className="w-20 h-20 rounded-full object-cover border border-gray-200"
              />
              <label className="absolute bottom-0 right-0 p-1 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      const tempUrl = URL.createObjectURL(file);
                      setPreviewUrl(tempUrl);
                    }
                  }}
                />
              </label>
            </div>
            <div>
              <h3 className="font-medium text-lg text-gray-900">{userData.username}</h3>
              <p className="text-gray-500">{bio || 'Bio'}</p>
            </div>
          </div>

          {/* Bio Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Bio</label>
            <textarea
              value={newBio}
              onChange={(e) => setNewBio(e.target.value)}
              className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-md resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bio"
            />
            <button
              onClick={handleUpdateBio}
              disabled={isUpdatingBio || newBio === bio}
              className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <span className="flex items-center justify-center gap-2">
                Save Bio
                {isUpdatingBio && (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
              </span>
            </button>
          </div>

          {/* Language Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Language / Язык</label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 px-4 rounded-md border ${
                  language === 'en'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Globe className="w-4 h-4 inline-block mr-2" />
                English
              </button>
              <button
                onClick={() => setLanguage('ru')}
                className={`flex-1 py-2 px-4 rounded-md border ${
                  language === 'ru'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Globe className="w-4 h-4 inline-block mr-2" />
                Русский
              </button>
            </div>
          </div>

          {/* Create Group Button */}
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="w-full py-2 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <Users className="w-4 h-4" />
            {translations.createGroup}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full py-2 flex items-center justify-center gap-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {translations.logout}
          </button>

          {/* Delete Account Button */}
          <button
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="w-full py-2 flex items-center justify-center gap-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeletingAccount ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash className="w-4 h-4" />
            )}
            {translations.deleteAccount}
          </button>
        </div>
      </div>

      {/* Group Create Modal */}
      {isGroupModalOpen && (
        <GroupCreateModal
          onClose={() => setIsGroupModalOpen(false)}
          onCreate={async (groupName, participants) => {
            try {
              const response = await fetch(`${BASE_URL}/groups/create`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: groupName, participants }),
              });
              if (response.ok) {
                setIsGroupModalOpen(false);
                setModal({ type: 'success', message: translations.groupCreated });
              } else {
                const data = await response.json();
                throw new Error(data.detail || 'Error creating group');
              }
            } catch (err: any) {
              setModal({ type: 'error', message: err.message || 'Group creation failed' });
            }
          }}
        />
      )}

      {/* Confirmation Modal */}
      {modal && (
        <ConfirmModal
          title={
            modal.type === 'success'
              ? translations.success
              : modal.type === 'logout'
              ? translations.logout
              : modal.type === 'deleteAccount'
              ? translations.deleteAccount
              : translations.error
          }
          message={modal.message}
          onConfirm={modal.onConfirm || (() => setModal(null))}
          onCancel={() => setModal(null)}
          confirmText={modal.type === 'success' || modal.type === 'error' ? 'OK' : translations.confirm}
          isError={modal.type === 'error'}
        />
      )}

      {/* Avatar Preview Modal */}
      {previewUrl && (
        <AvatarPreviewModal
          imageUrl={previewUrl}
          isUploading={isUploading}
          onConfirm={handleAvatarUpload}
          onCancel={() => {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setAvatarFile(null);
          }}
        />
      )}
    </div>
  );
});

ProfileComponentRTK.displayName = 'ProfileComponentRTK';

export default ProfileComponentRTK;