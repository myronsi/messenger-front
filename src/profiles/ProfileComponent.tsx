
import React, { useState, useEffect, forwardRef } from 'react';
import { Upload, X, LogOut, Users, Globe } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import GroupCreateModal from '@/components/GroupCreateModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/base/ui';
const BASE_URL = import.meta.env.VITE_BASE_URL;

interface ProfileComponentProps {
  onClose: () => void;
}

const ProfileComponent = forwardRef<HTMLDivElement, ProfileComponentProps>(({ onClose }, ref) => {
  const { translations, language, setLanguage } = useLanguage();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [bio, setBio] = useState('');
  const [newBio, setNewBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [modal, setModal] = useState<{
    type: 'deleteAccount' | 'error' | 'success' | 'logout';
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUsername(data.username);
          setAvatarUrl(data.avatar_url || DEFAULT_AVATAR);
          setBio(data.bio || '');
          setNewBio(data.bio || '');
        } else {
          throw new Error(translations.errorLoading);
        }
      } catch (err) {
        setModal({
          type: 'error',
          message: translations.errorLoading,
        });
      }
    };
    if (token) fetchProfile();
  }, [token, translations]);

  const handleAvatarUpload = async () => {
    if (!avatarFile || !token) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', avatarFile);

      const response = await fetch(`${BASE_URL}/auth/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setAvatarUrl(data.avatar_url);
        setModal({
          type: 'success',
          message: translations.uploading,
        });
        setAvatarFile(null);
      } else {
        throw new Error(data.detail || translations.errorUpdating);
      }
    } catch (err) {
      setModal({
        type: 'error',
        message: translations.errorUpdating,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateBio = async () => {
    if (newBio === bio || !token) return;

    setIsUpdatingBio(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/me/bio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio: newBio }),
      });
      const data = await response.json();
      if (response.ok) {
        setBio(newBio);
        setModal({
          type: 'success',
          message: translations.updating,
        });
        setTimeout(() => setModal(null), 1500);
      } else {
        throw new Error(data.detail || translations.errorUpdating);
      }
    } catch (err) {
      setModal({
        type: 'error',
        message: translations.errorUpdating,
      });
    } finally {
      setIsUpdatingBio(false);
    }
  };

  const handleLogout = () => {
    setModal({
      type: 'logout',
      message: translations.logoutConfirm,
      onConfirm: () => {
        localStorage.removeItem('access_token');
        window.location.reload();
      },
    });
  };

  const handleDeleteAccount = () => {
    setModal({
      type: 'deleteAccount',
      message: translations.deleteAccountConfirm,
      onConfirm: async () => {
        try {
          const response = await fetch(`${BASE_URL}/auth/me`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            localStorage.removeItem('access_token');
            window.location.reload();
          } else {
            throw new Error(translations.errorDeleting);
          }
        } catch (err) {
          setModal({
            type: 'error',
            message: translations.errorDeleting,
          });
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div ref={ref} className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg border border-gray-200 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">{translations.profile}</h2>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={`${BASE_URL}${avatarUrl}`}
                alt={username}
                className="w-20 h-20 rounded-full object-cover border border-gray-200"
              />
              <label className="absolute bottom-0 right-0 p-1 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div>
              <h3 className="font-medium text-lg text-gray-900">{username}</h3>
              <p className="text-gray-500">{bio || translations.bio}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{translations.bio}</label>
            <textarea
              value={newBio}
              onChange={(e) => setNewBio(e.target.value)}
              className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-md resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={translations.bio}
            />
            <button
              onClick={handleUpdateBio}
              disabled={isUpdatingBio || newBio === bio}
              className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingBio ? translations.updating : translations.saveBio}
            </button>
          </div>

          {avatarFile && (
            <button
              onClick={handleAvatarUpload}
              disabled={isUploading}
              className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? translations.uploading : translations.savePhoto}
            </button>
          )}

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

          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="w-full py-2 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <Users className="w-4 h-4" />
            {translations.createGroup}
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2 flex items-center justify-center gap-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {translations.logout}
          </button>

          <button
            onClick={handleDeleteAccount}
            className="w-full py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            {translations.deleteAccount}
          </button>
        </div>
      </div>

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
                setModal({ type: 'success', message: 'Группа создана!' });
                setTimeout(() => setModal(null), 1500);
              } else {
                const data = await response.json();
                throw new Error(data.detail || 'Ошибка при создании группы');
              }
            } catch (err) {
              setModal({ type: 'error', message: 'Не удалось создать группу. Попробуйте снова.' });
            }
          }}
        />
      )}

      {modal && (
        <ConfirmModal
          title={
            modal.type === 'deleteAccount'
              ? translations.deleteAccount
              : modal.type === 'success'
              ? 'Успех'
              : modal.type === 'logout'
              ? translations.logout
              : translations.error
          }
          message={modal.message}
          onConfirm={modal.onConfirm || (() => setModal(null))}
          onCancel={() => setModal(null)}
          confirmText={modal.type === 'success' || modal.type === 'error' ? 'OK' : translations.confirm}
          isError={modal.type === 'error'}
        />
      )}
    </div>
  );
});

export default ProfileComponent;
