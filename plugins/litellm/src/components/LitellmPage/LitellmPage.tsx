// plugins/litellm/src/components/LitellmPage.tsx
import React, { useState } from 'react';
import {
  Button,
  TextField,
  Typography,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Box,
} from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { CopyTextButton } from '@backstage/core-components';
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

// Helper function to decode a JWT token (without signature verification)
function decodeJwt(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token');
  }
  const payload = parts[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

type Step = 'login' | 'options' | 'final';

export const LitellmPage = () => { 
  const config = useApi(configApiRef);
  console.log('app.title', config.getOptionalString('app.title'));
  console.log('app.customSchedule', config.getOptionalString('app.customSchedule'));
  console.log('litellm config', config.keys());
  console.log('litellm config app', config.get('app'));
  // Initialize with a default URL but allow user to change it
  const [baseUrl, setBaseUrl] = useState<string>("http://localhost:4000");

  // Component state
  const [step, setStep] = useState<Step>('login');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [keyAlias, setKeyAlias] = useState<string>('');
  // Update the default profile to "none" instead of "dev"
  const [profile, setProfile] = useState<'none' | 'dev' | 'prod'>('none');
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [tabIndex, setTabIndex] = useState<number>(0);

  // Login: Sends credentials to /login and expects the token cookie to be set.
  const handleLogin = async () => {
    setErrorMessage('');
    if (!username || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }
    
    // Validate baseUrl format
    if (!baseUrl || !baseUrl.startsWith('http')) {
      setErrorMessage('Please enter a valid URL (starting with http:// or https://).');
      return;
    }
    
    try {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username, password }).toString(),
        redirect: 'manual',
        credentials: 'include',
      });
      // Check for opaque redirect or success.
      if ((response.type === "opaqueredirect" && response.status === 0) || response.ok) {
        setLoggedIn(true);
        // Transition to options step.
        setStep('options');
      } else {
        let errorMessage = `Login failed: ${response.status} ${response.statusText}`

        if (response.statusText?.includes('NetworkError')) {
          errorMessage += ' - Unable to connect - Please check if the URL is correct and the server is running';
        } else if (response.statusText?.includes('Unauthorized')) {
          errorMessage += ' - Invalid username or password';
        }
        setErrorMessage(errorMessage);
      }
    } catch (error: any) {
        let errorMessage = `Login failed: ${error.message}`
        
        if (error.message?.includes('NetworkError')) {
          errorMessage += ' - Unable to connect - Please check if the URL is correct and the server is running';
        } else if (error.message?.includes('Unauthorized')) {
          errorMessage += ' - Invalid username or password';
        }
        console.error(error);
        setErrorMessage(errorMessage);
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setGeneratedKey('');
    setErrorMessage('');
    setStep('login');
  };

  // Submit key options and generate API key with additional fields.
  const handleSubmitKeyOptions = async () => {
    setErrorMessage('');
    if (!keyAlias) {
      setErrorMessage('Please provide a key name.');
      return;
    }
    // Retrieve the JWT token from cookie, decode it, and extract the key.
    const storedToken = getCookieValue('token');
    if (!storedToken) {
      setErrorMessage("No token found in cookie. Make sure the cookie is accessible.");
      return;
    }
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
      // Only add tags if profile is not 'none'
      const requestBody: any = {
        models: ['gpt-3.5-turbo'],
        key_alias: keyAlias,
      };
      
      // Only add tags for premium profiles
      if (profile !== 'none') {
        requestBody.tags = [profile];
      }
      
      // Call /key/generate with additional fields
      const response = await fetch(`${baseUrl}/key/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keyForAuth}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const status = response.status;
        if (status === 400) {
          throw new Error(`Failed to generate key: ${status} Bad Request - This might be due to a duplicate key name. Please try a different name.`);
        } else if (status === 500) {
          throw new Error(`Failed to generate key: ${status} Internal Server Error - This might be because the key profile feature is premium. Try with 'None' profile option.`);
        } else {
          throw new Error(`Failed to generate key: ${status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      if (data.key) {
        setGeneratedKey(data.key);
        // Transition to final step.
        setStep('final');
      } else {
        setErrorMessage('No key returned from API.');
      }
    } catch (error: any) {
      setErrorMessage(`Error generating key: ${error.message}`);
    }
  };


  // Code samples with the generated API key and baseUrl substituted in.
  const codeSamples = {
    pythonOpenAI: `
import openai
client = openai.OpenAI(
    api_key="${generatedKey}",  # YOUR_API_KEY
    base_url="${baseUrl}"  # set openai_api_base to the LiteLLM Proxy
)
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello, what llm are you?"}]
)
print(response)
    `.trim(),
    pythonLangchain: `
from langchain.chat_models import ChatOpenAI
from langchain.prompts.chat import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from langchain.schema import HumanMessage, SystemMessage

chat = ChatOpenAI(
    openai_api_base="${baseUrl}",  # set openai_api_base to the LiteLLM Proxy
    api_key="${generatedKey}",
    model="gpt-3.5-turbo",
    temperature=0.1
)
messages = [
    HumanMessage(content="Hello, what llm are you?")
]
response = chat(messages)
print(response)
    `.trim(),
    jsLangchain: `
import { ChatOpenAI } from "@langchain/openai";

const chat = new ChatOpenAI({
  apiKey: "${generatedKey}",
  configuration: { baseURL: "${baseUrl}" }, // set openai_api_base to the LiteLLM Proxy
  model: "gpt-3.5-turbo",
  temperature: 0.1,
});

const messages = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Hello, what llm are you?" }
];

async function main() {
  const response = await chat.invoke(messages);
  console.log(response);
}
main();
    `.trim(),
    curl: `
curl --location '${baseUrl}/chat/completions' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer ${generatedKey}' \\
--data '{
  "model": "gpt-3.5-turbo",
  "messages": [
    { "role": "user", "content": "Hello, what llm are you?" }
  ]
}'
    `.trim(),
  };

  return (
    <div style={{ maxWidth: 600, padding: 16 }}>
      <Typography variant="h5">LiteLLM Key Manager</Typography>
      {step === 'login' && (
        <div style={{ marginTop: 16 }}>
          <TextField 
            label="LiteLLM API URL" 
            variant="outlined" 
            fullWidth 
            value={baseUrl} 
            onChange={e => setBaseUrl(e.target.value)} 
            margin="normal"
            placeholder="http://localhost:4000"
            helperText="Enter the base URL of your LiteLLM API server"
          />
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
            <div style={{ marginTop: 16, color: 'red' }}>{errorMessage}</div>
          )}
        </div>
      )}
  {step === 'options' && (
        <div style={{ marginTop: 16 }}>
          <Typography variant="h6">Key Options</Typography>
          <TextField 
            label="Key Name" 
            variant="outlined" 
            fullWidth 
            value={keyAlias} 
            onChange={e => setKeyAlias(e.target.value)} 
            margin="normal"
            helperText="Enter a name for your key"
          />
          <Typography variant="subtitle1" style={{ marginTop: 8 }}>Key Profile:</Typography>
          <Select
            value={profile}
            onChange={(e) => setProfile(e.target.value as 'dev' | 'prod' | 'none')}
            fullWidth
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="dev">Dev (Premium)</MenuItem>
            <MenuItem value="prod">Prod (Premium)</MenuItem>
          </Select>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSubmitKeyOptions} 
            style={{ marginTop: 16 }}
          >
            Generate API Key
          </Button>
          {errorMessage && (
            <div style={{ marginTop: 16, marginBottom: 24, color: 'red' }}>{errorMessage}</div>
          )}
          <br />
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleLogout} 
            style={{ marginTop: 20 }}
          >
            Logout
          </Button>
        </div>
      )}
      {step === 'final' && (
        <div style={{ marginTop: 16 }}>
          <Typography variant="h6">Your API Key:</Typography>
          <Box border={1} borderColor="grey.300" p={2} mb={2} position="relative">
            <Typography variant="body1" style={{ wordBreak: 'break-all' }}>
              {generatedKey}
            </Typography>
            <Box position="absolute" right={0} top={5}>
              <CopyTextButton text={generatedKey} />
            </Box>
          </Box>
          <Typography variant="h6">Usage Examples:</Typography>
          <Tabs
            value={tabIndex}
            onChange={(_, newIndex) => setTabIndex(newIndex)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Python OpenAI" />
            <Tab label="Python Langchain" />
            <Tab label="JS Langchain" />
            <Tab label="cURL" />
          </Tabs>
          <Box mt={2}>
            <Box position="relative">
              <pre style={{ outline: '1px solid #aaa', padding: 16, overflow: 'auto' }}>
                {tabIndex === 0 && (
                    <>{codeSamples.pythonOpenAI}</>
                )}
                {tabIndex === 1 && (
                    <>{codeSamples.pythonLangchain}</>
                )}
                {tabIndex === 2 && (
                    <>{codeSamples.jsLangchain}</>
                )}
                {tabIndex === 3 && (
                    <>{codeSamples.curl}</>
                )}
              </pre>
              <Box position="absolute" right={8} top={8}>
                <CopyTextButton 
                  text={
                    tabIndex === 0 ? codeSamples.pythonOpenAI :
                    tabIndex === 1 ? codeSamples.pythonLangchain :
                    tabIndex === 2 ? codeSamples.jsLangchain :
                    codeSamples.curl
                  }
                />
              </Box>
            </Box>
          </Box>
          <div style={{ marginTop: 16 }}>
            <Button variant="outlined" onClick={() => setStep('options')} style={{ marginRight: 8 }}>
              Back
            </Button>
            <br />
            <Button variant="outlined" color="secondary" onClick={handleLogout} style={{ marginTop: 20 }}>
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
