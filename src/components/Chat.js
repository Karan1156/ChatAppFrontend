import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { 
  Container, Row, Col, Form, Button, 
  InputGroup, Dropdown, Modal,
  Image, Spinner, Badge
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  FaUserCog, FaSignOutAlt, FaSearch, 
  FaImage, FaPaperclip, FaTimes,
  FaCheck, FaCheckDouble,
  FaTrash, FaFile, FaVideo, FaMusic,
  FaReply, FaBell, FaBellSlash,
  FaSmile, FaArrowLeft, FaPhone, FaVideo as FaVideoCall,
  FaEllipsisV
} from 'react-icons/fa';
import Avatar from './Avatar';
import NotificationPanel from './NotificationPanel';
import { formatDistanceToNow } from 'date-fns';
import './Chat.css';

const Chat = () => {
  const { user, logout } = useAuth();
  const { 
    unreadCount, 
    setIsPanelOpen, 
    toggleMuteChat, 
    mutedChats,
    addNotification 
  } = useNotification();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Track online status using frontend logic
  useEffect(() => {
    // Set current user as online
    if (user) {
      setOnlineUsers(prev => [...prev, user.id]);
    }

    // Update online status every 30 seconds
    const interval = setInterval(() => {
      // Simulate online status - users who have been active in the last 2 minutes
      const now = Date.now();
      // You can add logic here to track user activity
      // For now, we'll just keep current user online
    }, 30000);

    // Handle visibility change - user is online when tab is visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User might be away, but keep them online for simplicity
        // In production, you'd implement proper presence detection
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setShowMobileChat(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update online status based on user activity
  useEffect(() => {
    const updateOnlineStatus = () => {
      if (user) {
        setOnlineUsers(prev => {
          if (!prev.includes(user.id)) {
            return [...prev, user.id];
          }
          return prev;
        });
      }
    };

    // User is online when interacting with the app
    const events = ['click', 'touchstart', 'scroll', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, updateOnlineStatus);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateOnlineStatus);
      });
    };
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users/');
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Don't show alert for network errors on mobile
      if (!error.message?.includes('Network Error')) {
        alert('Failed to fetch users. Please pull to refresh.');
      }
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
      // Don't alert on mobile for background errors
    }
  };

  // Fetch messages when selected user changes
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (replyTo) {
        messageData.reply_to = replyTo.id;
      }

      await api.post('/chat/messages/', messageData);
      
      // Add notification for receiver
      if (selectedUser.id !== user.id) {
        addNotification({
          id: Date.now(),
          type: 'message',
          title: `New message from ${user.username}`,
          body: newMessage.trim(),
          timestamp: new Date().toISOString(),
          chat_id: selectedUser.id,
          isRead: false,
          onClick: () => setSelectedUser(selectedUser)
        });
      }
      
      setNewMessage('');
      setReplyTo(null);
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Better error handling for mobile
      let errorMsg = 'Failed to send message. ';
      if (error.response) {
        errorMsg += error.response.data?.message || 'Server error';
      } else if (error.request) {
        errorMsg += 'No response from server. Check your connection.';
      } else {
        errorMsg += error.message || 'Please try again.';
      }
      
      // Only show alert for non-network errors on mobile
      if (!error.message?.includes('Network Error')) {
        alert(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

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

      setReplyTo(null);
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

  // Check if a user is online (frontend simulation)
  const isUserOnline = (userId) => {
    // Current user is always online
    if (userId === user?.id) return true;
    
    // Check if user is in online list and has been active recently
    return onlineUsers.includes(userId) && Math.random() > 0.3; // Simulate some users online
  };

  return (
    <Container fluid className="chat-app p-0">
      <NotificationPanel />
      
      <Row className="h-100 m-0">
        {/* Sidebar - Users List */}
        <Col 
          md={3} 
          lg={3} 
          className={`chat-sidebar ${isMobile && showMobileChat ? 'd-none' : ''}`}
        >
          <div className="sidebar-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Chats</h5>
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="position-relative notification-btn"
                  onClick={() => setIsPanelOpen(true)}
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </Button>
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm" className="avatar-dropdown">
                    <Avatar user={user} size={30} />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => navigate('/profile')}>
                      <FaUserCog className="me-2" />
                      Profile
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={logout} className="text-danger">
                      <FaSignOutAlt className="me-2" />
                      Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
            <div className="user-greeting">
              <small className="text-muted">Welcome, {user?.username}</small>
            </div>
          </div>
          
          <div className="search-bar">
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

          <div className="user-list">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-muted mt-4">
                <p>{searchTerm ? 'No users found' : 'No users available'}</p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const online = isUserOnline(u.id);
                return (
                  <div
                    key={u.id}
                    className={`user-item ${selectedUser?.id === u.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedUser(u);
                      if (isMobile) setShowMobileChat(true);
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <div className="position-relative">
                        <Avatar user={u} size={45} className="me-3" />
                        <span className={`user-status ${online ? 'online' : 'offline'}`} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="fw-bold">{u.username}</div>
                          <small className="text-muted">2m ago</small>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="small text-muted text-truncate" style={{ maxWidth: '120px' }}>
                            {u.bio || 'No bio yet'}
                          </div>
                          {mutedChats.includes(u.id) && (
                            <FaBellSlash className="text-muted" size={12} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Col>
        
        {/* Chat Area */}
        <Col 
          md={9} 
          lg={9} 
          className={`chat-area ${isMobile && !showMobileChat ? 'd-none d-md-block' : ''}`}
        >
          {selectedUser ? (
            <>
              <div className="chat-header">
                <div className="d-flex align-items-center">
                  {isMobile && (
                    <Button
                      variant="link"
                      className="back-btn"
                      onClick={() => setShowMobileChat(false)}
                    >
                      <FaArrowLeft />
                    </Button>
                  )}
                  <Avatar user={selectedUser} size={40} className="me-3" />
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="mb-0">{selectedUser.username}</h5>
                      <Badge bg={isUserOnline(selectedUser.id) ? 'success' : 'secondary'} pill>
                        {isUserOnline(selectedUser.id) ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <small className="text-muted">
                      {selectedUser.bio || 'No bio yet'}
                    </small>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button variant="link" className="text-secondary">
                    <FaPhone />
                  </Button>
                  <Button variant="link" className="text-secondary">
                    <FaVideoCall />
                  </Button>
                  <Button
                    variant="link"
                    className="text-secondary"
                    onClick={() => toggleMuteChat(selectedUser.id)}
                    title={mutedChats.includes(selectedUser.id) ? 'Unmute' : 'Mute'}
                  >
                    {mutedChats.includes(selectedUser.id) ? <FaBellSlash /> : <FaBell />}
                  </Button>
                  <Dropdown>
                    <Dropdown.Toggle variant="link" className="text-secondary">
                      <FaEllipsisV />
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => navigate('/profile')}>
                        View Profile
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setSelectedUser(null)}>
                        Close Chat
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>

              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <Avatar user={selectedUser} size={80} />
                    <h5 className="mt-3">{selectedUser.username}</h5>
                    <p className="text-muted">No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => {
                      const isOwn = msg.sender === user.id;
                      const showAvatar = index === 0 || messages[index - 1]?.sender !== msg.sender;
                      
                      return (
                        <div
                          key={msg.id || index}
                          className={`message-wrapper ${isOwn ? 'own' : 'received'}`}
                          onMouseEnter={() => setHoveredMessage(msg.id)}
                          onMouseLeave={() => setHoveredMessage(null)}
                        >
                          <div className={`message-group ${!showAvatar ? 'consecutive' : ''}`}>
                            {!isOwn && showAvatar && (
                              <Avatar user={selectedUser} size={28} className="message-avatar" />
                            )}
                            <div className={`message-bubble ${isOwn ? 'own' : 'received'}`}>
                              {msg.reply_to && (
                                <div className="reply-preview">
                                  <small className="text-muted">Replying to:</small>
                                  <div>{msg.reply_to.content}</div>
                                </div>
                              )}
                              {renderMessageContent(msg)}
                              <div className="message-footer">
                                <small className="message-time">
                                  {formatTime(msg.timestamp)}
                                </small>
                                {isOwn && (
                                  <span className="message-status">
                                    {msg.is_read ? (
                                      <FaCheckDouble className="text-primary" />
                                    ) : msg.is_delivered ? (
                                      <FaCheckDouble className="text-muted" />
                                    ) : (
                                      <FaCheck className="text-muted" />
                                    )}
                                  </span>
                                )}
                              </div>
                              {hoveredMessage === msg.id && !msg.is_deleted && (
                                <div className="message-actions">
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => handleReply(msg)}
                                  >
                                    <FaReply />
                                  </Button>
                                  {isOwn && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-danger"
                                      onClick={() => {
                                        setSelectedMessage(msg);
                                        setShowDeleteModal(true);
                                      }}
                                    >
                                      <FaTrash />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {replyTo && (
                <div className="reply-indicator">
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

              <div className="message-input-area">
                <Form onSubmit={sendMessage} className="w-100">
                  <InputGroup>
                    <Button
                      variant="link"
                      className="text-secondary"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <FaSmile />
                    </Button>
                    
                    <Button
                      variant="link"
                      className="text-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || uploading || !selectedUser}
                    >
                      <FaPaperclip />
                    </Button>
                    
                    <Form.Control
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`Message ${selectedUser.username}...`}
                      disabled={loading || uploading}
                    />
                    
                    <Button 
                      type="submit" 
                      variant="primary"
                      disabled={loading || uploading || !newMessage.trim()}
                      className="send-btn"
                    >
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        'Send'
                      )}
                    </Button>
                  </InputGroup>
                  
                  {uploading && (
                    <div className="upload-progress">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Uploading...</small>
                        <small className="text-muted">{uploadProgress}%</small>
                      </div>
                      <div className="progress">
                        <div 
                          className="progress-bar progress-bar-striped progress-bar-animated"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Form>
              </div>
            </>
          ) : (
            <div className="empty-chat-state">
              <div className="text-center">
                <Avatar user={null} size={100} />
                <h4 className="mt-3">Welcome to ChatApp</h4>
                <p className="text-muted">Select a user from the sidebar to start chatting</p>
                <Button variant="primary" onClick={fetchUsers}>
                  Refresh Users
                </Button>
              </div>
            </div>
          )}
        </Col>
      </Row>

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