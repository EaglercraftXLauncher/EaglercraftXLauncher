import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ContentCard, { ContentItem } from '../components/ContentCard';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getGravatarUrl } from '../lib/helpers';

interface Profile {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatar: string;
  joinedAt: string;
  contentCount: number;
  content: ContentItem[];
}

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', bio: '' });

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/${userId}`
      );
      if (response.ok) {
        const data = await response.json() as Profile;
        setProfile(data);
        setEditFormData({ name: data.name, bio: data.bio });
      } else {
        addToast('Profile not found', 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      addToast('Error loading profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser?.id}`,
          },
          body: JSON.stringify(editFormData),
        }
      );

      if (response.ok) {
        const updatedProfile = await response.json() as Profile;
        setProfile(updatedProfile);
        setIsEditModalOpen(false);
        addToast('Profile updated successfully', 'success');
      } else {
        addToast('Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Update error:', error);
      addToast('Error updating profile', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="profile-layout">
        <Sidebar />
        <main className="profile-main">
          <div className="loading">Loading profile...</div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-layout">
        <Sidebar />
        <main className="profile-main">
          <div className="empty-state">Profile not found</div>
        </main>
      </div>
    );
  }

  return (
    <div className="profile-layout">
      <Sidebar />
      <main className="profile-main">
        <div className="profile-header">
          <img
            src={getGravatarUrl(profile.email)}
            alt={profile.name}
            className="profile-avatar"
          />
          <div className="profile-info">
            <h1>{profile.name}</h1>
            <p className="profile-email">{profile.email}</p>
            <p className="profile-bio">{profile.bio}</p>
            <p className="profile-meta">
              Joined {new Date(profile.joinedAt).toLocaleDateString()}
            </p>
            {isOwnProfile && (
              <button
                className="btn-primary"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="profile-content">
          <h2>Uploaded Content ({profile.contentCount})</h2>
          {profile.content.length === 0 ? (
            <div className="empty-state">No content uploaded yet</div>
          ) : (
            <div className="content-grid">
              {profile.content.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </main>

      {isOwnProfile && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Profile"
          actionText="Save"
          onAction={handleSaveProfile}
        >
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea
              value={editFormData.bio}
              onChange={(e) =>
                setEditFormData({ ...editFormData, bio: e.target.value })
              }
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProfilePage;