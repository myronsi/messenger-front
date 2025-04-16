
import React, { useState, useEffect, forwardRef } from 'react';
import { Upload, X } from 'lucide-react';
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modal, setModal] = useState<{
    type: 'deleteAccount' | 'error' | 'success';
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
