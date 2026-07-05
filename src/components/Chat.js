import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Container, Row, Col, Form, Button, 
  InputGroup, Badge, Dropdown, Modal,
  Image, Spinner
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  FaUserCog, FaSignOutAlt, FaSearch, 
  FaImage, FaPaperclip, FaTimes,
  FaDownload, FaCheck, FaCheckDouble,
  FaTrash, FaFile, FaVideo, FaMusic,
  FaReply
} from 'react-icons/fa';
import Avatar from './Avatar';
import { formatDistanceToNow } from 'date-fns';

const Chat = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch messages when selected user changes
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users/');
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedUser) return;
    try {
      const response = await api.get(`/chat/messages/?user_id=${selectedUser.id}`);
      setMessages(response.data);
      
      // Mark messages as read
      const unreadMessages = response.data.filter(msg => 
        msg.receiver === user.id && !msg.is_read
      );
      if (unreadMessages.length > 0) {
        await api.post('/chat/status/', {
          message_id: unreadMessages[0].id,
          status_type: 'read'
        });
      }
      
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    setLoading(true);
    try {
      const messageData = {
        receiver: selectedUser.id,
        content: newMessage.trim(),
        message_type: 'text'
      };

      // Add reply to if replying
      if (replyTo) {
        messageData.reply_to = replyTo.id;
      }

      await api.post('/chat/messages/', messageData);
      
      setNewMessage('');
      setReplyTo(null); // Clear reply state
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser) {
      if (!selectedUser) alert('Please select a user first');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit');
      return;
    }

    // Validate file type
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip', 'text/plain'
    ];

    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      alert('File type not supported');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('receiver', selectedUser.id);
      formData.append('media_file', file);
      
      // Determine message type based on file type
      let messageType = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'audio';
      
      formData.append('message_type', messageType);

      // Add reply to if replying
      if (replyTo) {
        formData.append('reply_to', replyTo.id);
      }

      await api.post('/chat/messages/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setReplyTo(null); // Clear reply state
      await fetchMessages();
      setUploadProgress(0);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteMessage = async () => {
    if (!selectedMessage) return;
    
    try {
      await api.delete(`/chat/messages/${selectedMessage.id}/`);
      setShowDeleteModal(false);
      setSelectedMessage(null);
      setHoveredMessage(null);
      await fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const downloadMedia = (message) => {
    if (message.media_url) {
      window.open(message.media_url, '_blank');
    }
  };

  const handleReply = (message) => {
    setReplyTo(message);
    // Focus the input
    const input = document.querySelector('input[type="text"]');
    if (input) input.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getFileIcon = (message) => {
    if (message.message_type === 'image') return <FaImage />;
    if (message.message_type === 'video') return <FaVideo />;
    if (message.message_type === 'audio') return <FaMusic />;
    return <FaFile />;
  };

  const renderMessageContent = (msg) => {
    if (msg.is_deleted) {
      return <em className="text-muted">Message deleted</em>;
    }

    switch (msg.message_type) {
      case 'image':
        return (
          <div>
            <Image
              src={msg.media_url || msg.thumbnail_url}
              alt="Image"
              fluid
              style={{ maxWidth: '250px', maxHeight: '250px', borderRadius: '8px' }}
              onClick={() => msg.media_url && window.open(msg.media_url, '_blank')}
              className="cursor-pointer"
            />
            {msg.content && <div className="mt-1">{msg.content}</div>}
          </div>
        );
      case 'video':
        return (
          <div>
            <video
              src={msg.media_url}
              controls
              style={{ maxWidth: '250px', maxHeight: '250px', borderRadius: '8px' }}
            />
            {msg.content && <div className="mt-1">{msg.content}</div>}
          </div>
        );
      case 'audio':
        return (
          <div>
            <audio src={msg.media_url} controls style={{ width: '200px' }} />
            {msg.content && <div className="mt-1">{msg.content}</div>}
          </div>
        );
      case 'file':
        return (
          <div>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => downloadMedia(msg)}
              className="d-flex align-items-center gap-2"
            >
              {getFileIcon(msg)}
              <span>{msg.file_name || 'Download file'}</span>
              <span className="text-muted small">
                ({msg.file_size ? (msg.file_size / 1024).toFixed(0) : 0} KB)
              </span>
            </Button>
            {msg.content && <div className="mt-1">{msg.content}</div>}
          </div>
        );
      default:
        return <div>{msg.content}</div>;
    }
  };

  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 m-0">
        {/* Sidebar */}
        <Col md={3} className="border-end p-0 bg-light">
          <div className="p-3 border-bottom bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Chats</h5>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <Avatar user={user} size={30} />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => navigate('/profile')}>
                    <FaUserCog className="me-2" />
                    Profile Settings
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={logout} className="text-danger">
                    <FaSignOutAlt className="me-2" />
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
            <div className="mt-2">
              <small className="text-muted">Welcome, {user?.username}</small>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="p-2 border-bottom bg-white">
            <InputGroup size="sm">
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </div>

          {/* User List */}
          <div className="overflow-auto" style={{ height: 'calc(100vh - 160px)' }}>
            {filteredUsers.length === 0 ? (
              <div className="text-center text-muted mt-4">
                <p>{searchTerm ? 'No users found' : 'No users available'}</p>
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className={`p-3 border-bottom cursor-pointer user-item ${
                    selectedUser?.id === u.id ? 'active' : 'bg-white'
                  }`}
                  onClick={() => setSelectedUser(u)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center">
                    <Avatar user={u} size={45} className="me-3" />
                    <div className="flex-grow-1">
                      <div className="fw-bold">{u.username}</div>
                      <div className="small text-muted">
                        {u.bio || 'No bio yet'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Col>
        
        {/* Chat Area */}
        <Col md={9} className="d-flex flex-column bg-white p-0">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-bottom bg-light">
                <div className="d-flex align-items-center">
                  <Avatar user={selectedUser} size={40} className="me-3" />
                  <div className="flex-grow-1">
                    <h5 className="mb-0">{selectedUser.username}</h5>
                    <small className="text-muted">
                      {selectedUser.bio || 'No bio yet'}
                    </small>
                  </div>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => setSelectedUser(null)}
                  >
                    <FaTimes />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div 
                className="flex-grow-1 overflow-auto p-3" 
                style={{ height: 'calc(100vh - 140px)', backgroundColor: '#f8f9fa' }}
              >
                {messages.length === 0 ? (
                  <div className="text-center text-muted mt-5">
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`mb-2 message-container`}
                      onMouseEnter={() => setHoveredMessage(msg.id)}
                      onMouseLeave={() => setHoveredMessage(null)}
                    >
                      <div
                        className={`d-flex ${
                          msg.sender === user.id ? 'justify-content-end' : 'justify-content-start'
                        }`}
                      >
                        <div
                          className={`message-bubble d-inline-block p-2 rounded position-relative ${
                            msg.sender === user.id 
                              ? 'bg-primary text-white' 
                              : 'bg-white border'
                          }`}
                          style={{ maxWidth: '70%' }}
                        >
                          {/* Reply indicator */}
                          {msg.reply_to && (
                            <div className="small text-muted mb-1 border-start ps-2">
                              <div className="fw-bold">Replied to:</div>
                              <div>{msg.reply_to.content}</div>
                            </div>
                          )}
                          
                          {renderMessageContent(msg)}
                          
                          <div className="d-flex justify-content-between align-items-center mt-1">
                            <small 
                              className={`${
                                msg.sender === user.id ? 'text-light' : 'text-muted'
                              }`}
                              style={{ fontSize: '0.7rem' }}
                            >
                              {formatTime(msg.timestamp)}
                            </small>
                            <div className="d-flex align-items-center gap-1">
                              {msg.sender === user.id && (
                                <>
                                  {msg.is_delivered ? (
                                    <FaCheckDouble 
                                      className={msg.is_read ? 'text-info' : 'text-muted'}
                                      size={12}
                                    />
                                  ) : (
                                    <FaCheck className="text-muted" size={12} />
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Hover Controls - Only show for own messages and on hover */}
                          {msg.sender === user.id && hoveredMessage === msg.id && !msg.is_deleted && (
                            <div 
                              className="message-controls position-absolute"
                              style={{
                                top: '-12px',
                                right: msg.sender === user.id ? '-10px' : 'auto',
                                left: msg.sender === user.id ? 'auto' : '-10px',
                                display: 'flex',
                                gap: '4px',
                                backgroundColor: 'white',
                                borderRadius: '20px',
                                padding: '4px 8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                zIndex: 10
                              }}
                            >
                              <Button
                                variant="link"
                                className="p-0 text-secondary"
                                size="sm"
                                onClick={() => handleReply(msg)}
                                title="Reply"
                                style={{ fontSize: '12px' }}
                              >
                                <FaReply />
                              </Button>
                              <Button
                                variant="link"
                                className="p-0 text-danger"
                                size="sm"
                                onClick={() => {
                                  setSelectedMessage(msg);
                                  setShowDeleteModal(true);
                                }}
                                title="Delete"
                                style={{ fontSize: '12px' }}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          )}

                          {/* Hover Controls for received messages - only reply */}
                          {msg.sender !== user.id && hoveredMessage === msg.id && !msg.is_deleted && (
                            <div 
                              className="message-controls position-absolute"
                              style={{
                                top: '-12px',
                                right: 'auto',
                                left: '-10px',
                                display: 'flex',
                                gap: '4px',
                                backgroundColor: 'white',
                                borderRadius: '20px',
                                padding: '4px 8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                zIndex: 10
                              }}
                            >
                              <Button
                                variant="link"
                                className="p-0 text-secondary"
                                size="sm"
                                onClick={() => handleReply(msg)}
                                title="Reply"
                                style={{ fontSize: '12px' }}
                              >
                                <FaReply />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Indicator */}
              {replyTo && (
                <div className="p-2 border-top bg-light d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <FaReply className="text-primary" />
                    <div>
                      <small className="text-muted">Replying to:</small>
                      <div className="small fw-bold">{replyTo.content || 'Media message'}</div>
                    </div>
                  </div>
                  <Button variant="link" size="sm" onClick={cancelReply} className="text-danger">
                    <FaTimes />
                  </Button>
                </div>
              )}

              {/* Message Input */}
              <div className="p-3 border-top bg-light">
                <Form onSubmit={sendMessage}>
                  <InputGroup>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt"
                    />
                    
                    {/* Attachment buttons */}
                    <Button
                      variant="outline-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || uploading || !selectedUser}
                      title="Attach file"
                    >
                      <FaPaperclip />
                    </Button>
                    
                    <Button
                      variant="outline-secondary"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'image/*';
                          fileInputRef.current.click();
                        }
                      }}
                      disabled={loading || uploading || !selectedUser}
                      title="Send image"
                    >
                      <FaImage />
                    </Button>
                    
                    <Form.Control
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={uploading ? `Uploading... ${uploadProgress}%` : `Message ${selectedUser.username}...`}
                      disabled={loading || uploading}
                    />
                    
                    <Button 
                      type="submit" 
                      variant="primary"
                      disabled={loading || uploading || !newMessage.trim()}
                    >
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        'Send'
                      )}
                    </Button>
                  </InputGroup>
                  
                  {/* Upload progress bar */}
                  {uploading && (
                    <div className="mt-2">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Uploading file...</small>
                        <small className="text-muted">{uploadProgress}%</small>
                      </div>
                      <div className="progress" style={{ height: '5px' }}>
                        <div 
                          className="progress-bar progress-bar-striped progress-bar-animated"
                          role="progressbar"
                          style={{ width: `${uploadProgress}%` }}
                          aria-valuenow={uploadProgress}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        />
                      </div>
                    </div>
                  )}
                </Form>
              </div>
            </>
          ) : (
            <div className="d-flex flex-column justify-content-center align-items-center h-100">
              <div className="text-center">
                <Avatar user={null} size={80} />
                <h5 className="text-muted mt-3">Welcome to Chat App</h5>
                <p className="text-muted">Select a user from the sidebar to start chatting</p>
                <Button variant="primary" onClick={fetchUsers}>
                  Refresh Users
                </Button>
              </div>
            </div>
          )}
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Message</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this message?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteMessage}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Chat;