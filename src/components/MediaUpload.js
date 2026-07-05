import React, { useState, useRef } from 'react';
import { Button, Spinner, ProgressBar, Alert } from 'react-bootstrap';
import { FaImage, FaVideo, FaFile, FaTimes, FaUpload } from 'react-icons/fa';

const MediaUpload = ({ onUpload, onCancel, maxSize = 50 }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds ${maxSize}MB limit`);
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                       'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav',
                       'application/pdf', 'application/msword', 'application/zip'];
    
    if (!validTypes.includes(selectedFile.type)) {
      setError('File type not supported');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create preview
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('media_file', file);
      formData.append('message_type', getMessageType(file.type));
      formData.append('receiver', ''); // Will be set by parent

      // Simulate upload progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Call parent upload handler
      await onUpload(formData);

      clearInterval(interval);
      setProgress(100);
      
      // Reset after successful upload
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setProgress(0);
        setUploading(false);
      }, 1000);

    } catch (error) {
      setError(error.message || 'Upload failed');
      setUploading(false);
    }
  };

  const getMessageType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type.startsWith('image/')) return <FaImage size={24} />;
    if (file.type.startsWith('video/')) return <FaVideo size={24} />;
    return <FaFile size={24} />;
  };

  return (
    <div className="media-upload p-3 border rounded bg-light">
      {error && <Alert variant="danger" className="mb-2">{error}</Alert>}
      
      {!file ? (
        <div 
          className="text-center p-4 border rounded bg-white"
          style={{ cursor: 'pointer' }}
          onClick={() => fileInputRef.current.click()}
        >
          <FaUpload size={32} className="text-muted mb-2" />
          <p className="mb-0">Click to upload a file</p>
          <small className="text-muted">Max size: {maxSize}MB</small>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div>
          <div className="d-flex align-items-start mb-3">
            <div className="flex-shrink-0 me-3">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
              ) : (
                <div className="p-3 bg-secondary bg-opacity-10 rounded">
                  {getFileIcon()}
                </div>
              )}
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong>{file.name}</strong>
                  <div className="text-muted small">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setError(null);
                    onCancel();
                  }}
                  disabled={uploading}
                >
                  <FaTimes />
                </Button>
              </div>
              {uploading && (
                <div className="mt-2">
                  <ProgressBar 
                    now={progress} 
                    label={`${progress}%`}
                    variant={progress === 100 ? 'success' : 'primary'}
                  />
                </div>
              )}
            </div>
          </div>
          
          {!uploading && (
            <div className="d-flex gap-2">
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleUpload}
                className="flex-grow-1"
              >
                <FaUpload className="me-2" />
                Upload
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setError(null);
                  onCancel();
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaUpload;