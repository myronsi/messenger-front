
import React, { useState, useEffect, forwardRef } from 'react';
import { Upload, X, LogOut } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface ProfileComponentProps {
  onClose: () => void;
}

const BASE_URL = "http://192.168.178.29:8000";
const DEFAULT_AVATAR = "/static/avatars/default.jpg";

const ProfileComponent = forwardRef<HTMLDivElement, ProfileComponentProps>(({ onClose }, ref) => {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [bio, setBio] = useState('');
  const [newBio, setNewBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);
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
          throw new Error('Ошибка загрузки профиля');
        }
      } catch (err) {
        setModal({
          type: 'error',
          message: 'Не удалось загрузить профиль. Попробуйте снова.',
        });
      }
    };
    if (token) fetchProfile();
  }, [token]);

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
          message: 'Фото профиля обновлено!',
        });
        setAvatarFile(null);
      } else {
        throw new Error(data.detail || 'Ошибка при загрузке фото');
      }
    } catch (err) {
      setModal({
        type: 'error',
        message: 'Не удалось загрузить фото. Попробуйте снова.',
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
          message: 'Описание профиля обновлено!',
        });
        setTimeout(() => setModal(null), 1500);
      } else {
        throw new Error(data.detail || 'Ошибка при обновлении описания');
      }
    } catch (err) {
      setModal({
        type: 'error',
        message: 'Не удалось обновить описание. Попробуйте снова.',
      });
    } finally {
      setIsUpdatingBio(false);
    }
  };

  const handleLogout = () => {
    setModal({
      type: 'logout',
      message: 'Вы уверены, что хотите выйти?',
      onConfirm: () => {
        localStorage.removeItem('access_token');
        window.location.reload();
      },
    });
  };

  const handleDeleteAccount = () => {
    setModal({
      type: 'deleteAccount',
      message: 'Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.',
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
            throw new Error('Ошибка при удалении аккаунта');
          }
        } catch (err) {
          setModal({
            type: 'error',
            message: 'Не удалось удалить аккаунт. Попробуйте снова.',
          });
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div ref={ref} className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-accent rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Профиль</h2>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={`${BASE_URL}${avatarUrl}`}
                alt={username}
                className="w-20 h-20 rounded-full object-cover"
              />
              <label className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
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
              <h3 className="font-medium text-lg">{username}</h3>
              <p className="text-muted-foreground">{bio || 'Нет описания'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Описание профиля</label>
            <textarea
              value={newBio}
              onChange={(e) => setNewBio(e.target.value)}
              className="w-full p-2 bg-background text-foreground border border-input rounded-md resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Расскажите о себе..."
            />
            <button
              onClick={handleUpdateBio}
              disabled={isUpdatingBio || newBio === bio}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isUpdatingBio ? 'Обновление...' : 'Сохранить описание'}
            </button>
          </div>

          {avatarFile && (
            <button
              onClick={handleAvatarUpload}
              disabled={isUploading}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Загрузка...' : 'Сохранить фото'}
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full py-2 flex items-center justify-center gap-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Выйти из аккаунта
          </button>

          <button
            onClick={handleDeleteAccount}
            className="w-full py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
          >
            Удалить аккаунт
          </button>
        </div>
      </div>

      {modal && (
        <ConfirmModal
          title={
            modal.type === 'deleteAccount'
              ? 'Удаление аккаунта'
              : modal.type === 'success'
              ? 'Успех'
              : modal.type === 'logout'
              ? 'Выход'
              : 'Ошибка'
          }
          message={modal.message}
          onConfirm={modal.onConfirm || (() => setModal(null))}
          onCancel={() => setModal(null)}
          confirmText={modal.type === 'success' || modal.type === 'error' ? 'OK' : 'Подтвердить'}
          isError={modal.type === 'error'}
        />
      )}
    </div>
  );
});

export default ProfileComponent;
