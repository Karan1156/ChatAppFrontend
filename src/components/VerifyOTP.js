import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { verifyOTP } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await verifyOTP(email, otp);
    if (result.success) {
      setMessage('Email verified successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.error?.error || 'Invalid OTP');
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError('');
    setMessage('');
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/resend-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage('New OTP sent to your email!');
      } else {
        setError(data.error || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Failed to resend OTP');
    }
    setResending(false);
  };

  if (!email) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Card style={{ width: '400px' }}>
          <Card.Body>
            <Alert variant="danger">
              No email provided. Please <Link to="/register">register</Link> first.
            </Alert>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Card style={{ width: '400px' }}>
        <Card.Body>
          <h3 className="text-center mb-4">Verify Email Check spam</h3>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          <p className="text-center">
            We've sent an OTP to <strong>{email}</strong>
          </p>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>OTP Code</Form.Label>
              <Form.Control
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                required
                disabled={loading}
              />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
          </Form>
          <div className="text-center mt-3">
            <Button 
              variant="link" 
              onClick={handleResendOTP} 
              disabled={resending}
            >
              {resending ? 'Sending...' : 'Resend OTP'}
            </Button>
          </div>
          <div className="text-center mt-2">
            <Link to="/login">Back to Login</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default VerifyOTP;