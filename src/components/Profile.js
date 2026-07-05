import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Container, Row, Col, Card, Form, Button, 
  Alert, Spinner, Badge 
} from 'react-bootstrap';
import { FaCamera, FaSave, FaTimes, FaUser } from 'react-icons/fa';
import Avatar from './Avatar';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
      });
      setPreviewUrl(user.profile_picture_url || null);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('username', formData.username);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('bio', formData.bio);
      
      if (profilePicture) {
        formDataToSend.append('profile_picture', profilePicture);
      }

      const response = await api.put('/auth/profile/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(response.data);
      setMessage('Profile updated successfully!');
      setIsEditing(false);
      setProfilePicture(null);
      
      if (response.data.profile_picture_url) {
        setPreviewUrl(response.data.profile_picture_url);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProfilePicture(null);
    setPreviewUrl(user?.profile_picture_url || null);
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.bio || '',
    });
    setError('');
    setMessage('');
  };

  const handleRemovePhoto = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('profile_picture', '');
      
      const response = await api.patch('/auth/profile/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUser(response.data);
      setPreviewUrl(null);
      setMessage('Profile picture removed');
    } catch (error) {
      setError('Failed to remove profile picture');
    }
  };

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Profile Settings</h5>
              {!isEditing && (
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {message && <Alert variant="success">{message}</Alert>}
              {error && <Alert variant="danger">{error}</Alert>}

              {/* Profile Picture */}
              <div className="text-center mb-4">
                <div className="position-relative d-inline-block">
                  <Avatar user={user} size={150} />
                  
                  {isEditing && (
                    <div 
                      className="position-absolute bottom-0 end-0"
                      style={{ cursor: 'pointer' }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current.click()}
                        style={{ borderRadius: '50%' }}
                      >
                        <FaCamera />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>
                
                {isEditing && previewUrl && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-danger mt-2"
                    onClick={handleRemovePhoto}
                  >
                    Remove Photo
                  </Button>
                )}
                
                <div className="mt-2">
                  <Badge bg={user?.is_email_verified ? 'success' : 'warning'}>
                    {user?.is_email_verified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
              </div>

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    required
                  />
                  <Form.Text className="text-muted">
                    Email is private and won't be shown to other users
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Bio</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    placeholder="Tell us about yourself..."
                  />
                  <Form.Text className="text-muted">
                    {formData.bio?.length || 0}/500 characters
                  </Form.Text>
                </Form.Group>

                {isEditing && (
                  <div className="d-flex gap-2">
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={loading}
                      className="flex-grow-1"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      <FaTimes />
                    </Button>
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;