// plugins/litellm/src/components/LitellmPage.tsx
import React, { useState } from 'react';
import { Button, TextField, Typography } from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';

// Define an interface for the decoded JWT payload
interface JwtPayload {
  key: string;
  [prop: string]: any;
}

// Helper function to read a cookie by name
function getCookieValue(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
  return null;
}

export const LitellmPage = () => {
  const config = useApi(configApiRef);
  // For now, hardcoding baseUrl; later, you can retrieve it from config
  const baseUrl = "http://localhost:4000";

  // State for login form and API interactions
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  // Instead of storing an extracted token, we mark that we're "logged in"
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Login sends credentials to /login and relies on the browser to store the token cookie.
  const handleLogin = async () => {
    setErrorMessage('');
    if (!username || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ username, password }).toString(),
        redirect: 'manual',
        credentials: 'include', // Ensure cookies are sent/received
      });
      // Check for an opaque redirect or a successful response.
      if ((response.type === "opaqueredirect" && response.status === 0) || response.ok) {
        // Login succeeded; the token cookie is set automatically.
        setLoggedIn(true);
      } else {
        setErrorMessage(`Login failed: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(`Login error: ${error.message}`);
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setGeneratedKey('');
    setErrorMessage('');
  };

  // Helper function to decode JWT tokens
  function decodeJwt(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token');
    }
    const payload = parts[1];
    // Convert base64url to base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Decode the base64 string
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  // Generate API Key by calling /key/generate.
  // This retrieves the JWT token from the cookie, decodes it, extracts the "key"
  // property, and then uses that in the Authorization header.
  const handleGenerateKey = async () => {
    setErrorMessage('');
    setGeneratedKey('');
    if (!loggedIn) {
      setErrorMessage('Not authenticated. Please login first.');
      return;
    }
    // Retrieve the JWT token from the cookie
    const storedToken = getCookieValue('token');
    if (!storedToken) {
      setErrorMessage("No token found in cookie. Make sure the cookie is accessible.");
      return;
    }
    // Decode the token to extract the actual key
    let decoded: JwtPayload;
    try {
      decoded = decodeJwt(storedToken);
    } catch (error: any) {
      setErrorMessage("Failed to decode JWT token.");
      return;
    }
    const keyForAuth = decoded.key;
    if (!keyForAuth) {
      setErrorMessage("No key found in token payload.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/key/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keyForAuth}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include credentials if needed.
        body: JSON.stringify({
          models: ['gpt-3.5-turbo'],
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to generate key: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.key) {
        setGeneratedKey(data.key);
      } else {
        setErrorMessage('No key returned from API.');
      }
    } catch (error: any) {
      setErrorMessage(`Error generating key: ${error.message}`);
    }
  };

  if (!baseUrl) {
    return <div style={{ color: 'red' }}>LiteLLM API base URL is not configured. Please check your settings.</div>;
  }

  return (
    <div style={{ maxWidth: 600, padding: 16 }}>
      <Typography variant="h5">LiteLLM Key Manager</Typography>
      {!loggedIn ? (
        // Login form: collects username and password.
        <div style={{ marginTop: 16 }}>
          <TextField 
            label="Username" 
            variant="outlined" 
            fullWidth 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            margin="normal"
          />
          <TextField 
            label="Password" 
            variant="outlined" 
            fullWidth 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            type="password" 
            autoComplete="off"
            margin="normal"
          />
          <Button variant="contained" color="primary" onClick={handleLogin}>
            Login
          </Button>
          {errorMessage && (
            <div style={{ marginTop: 16, color: 'red' }}>
              {errorMessage}
            </div>
          )}
        </div>
      ) : (
        // After login: show logged-in state, logout button, and generate key controls.
        <div style={{ marginTop: 16 }}>
          <Typography>Logged in as: {username}</Typography>
          <Button variant="contained" color="secondary" onClick={handleLogout} style={{ marginBottom: 16 }}>
            Logout
          </Button>
          <div>
            <Button variant="contained" color="primary" onClick={handleGenerateKey}>
              Generate API Key
            </Button>
          </div>
          {errorMessage && (
            <div style={{ marginTop: 16, color: 'red' }}>
              {errorMessage}
            </div>
          )}
          {generatedKey && (
            <div style={{ marginTop: 16, wordBreak: 'break-all', color: 'green' }}>
              <strong>New API Key:</strong> {generatedKey}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
