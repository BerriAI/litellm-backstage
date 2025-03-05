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
  Divider,
  Paper,
  Grid,
} from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { CopyTextButton } from '@backstage/core-components';
import { InfoCard } from '@backstage/core-components';
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

// We only need options and final steps now
type Step = 'options' | 'final';

type LitellmConfig = {
  baseUrl: string;
  apiKey: string;
}

export const LitellmPage = () => { 
  const config = useApi(configApiRef);
  const litellmConfig: LitellmConfig = config.get('app.litellm');
  if (!litellmConfig || !litellmConfig.baseUrl || !litellmConfig.apiKey) {
    throw new Error('LiteLLM config is not set');
  }
  const baseUrl = litellmConfig.baseUrl;
  const organizationApiKey = litellmConfig.apiKey;

  // Component state
  const [keyAlias, setKeyAlias] = useState<string>('');
  const [profile, setProfile] = useState<'none' | 'dev' | 'prod'>('none');
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Submit key options and generate API key with additional fields.
  const handleSubmitKeyOptions = async () => {
    setErrorMessage('');
    if (!keyAlias) {
      setErrorMessage('Please provide a key name.');
      return;
    }

    setIsGenerating(true);
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
          'Authorization': `Bearer ${organizationApiKey}`,
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
      } else {
        setErrorMessage('No key returned from API.');
      }
    } catch (error: any) {
      setErrorMessage(`Error generating key: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Code samples with the generated API key and baseUrl substituted in.
  const codeSamples = {
    pythonOpenAI: `
import openai
client = openai.OpenAI(
    api_key="${generatedKey || '<your-generated-key>'}",  # YOUR_API_KEY
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
    api_key="${generatedKey || '<your-generated-key>'}",
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
  apiKey: "${generatedKey || '<your-generated-key>'}",
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
--header 'Authorization: Bearer ${generatedKey || '<your-generated-key>'}' \\
--data '{
  "model": "gpt-3.5-turbo",
  "messages": [
    { "role": "user", "content": "Hello, what llm are you?" }
  ]
}'
    `.trim(),
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <Typography variant="h4" gutterBottom>LiteLLM Key Manager</Typography>

      {/* Key generation section */}
      <InfoCard title="Generate API Key">
        <div style={{ marginTop: 16, padding: 16 }}>
          <TextField 
            label="Key Name" 
            variant="outlined" 
            fullWidth 
            value={keyAlias} 
            onChange={e => setKeyAlias(e.target.value)} 
            margin="normal"
            helperText="Enter a name for your key"
          />
          <Typography variant="subtitle1" style={{ marginTop: 16 }}>Key Profile:</Typography>
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
            style={{ marginTop: 24 }}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate API Key'}
          </Button>
          {errorMessage && (
            <div style={{ marginTop: 16, marginBottom: 8, color: 'red' }}>{errorMessage}</div>
          )}
        </div>
      </InfoCard>
      <div style={{ marginBottom: 14 }} />
      {/* Generated key display and code samples */}
      <InfoCard title="Your API Key" subheader={!generatedKey ? "Generate a key to see it here" : ""}>
        <div style={{ padding: 16 }}>
          {generatedKey ? (
            <Box border={1} borderColor="grey.300" p={2} mb={2} position="relative" bgcolor="rgba(0, 0, 0, 0.04)">
              <Typography variant="body1" style={{ wordBreak: 'break-all' }}>
                {generatedKey}
              </Typography>
              <Box position="absolute" right={8} top={8}>
                <CopyTextButton text={generatedKey} />
              </Box>
            </Box>
          ) : (
            <Box p={2} mb={2} textAlign="center" bgcolor="rgba(0, 0, 0, 0.04)" borderRadius={4}>
              <Typography variant="body1" color="textSecondary">
                No key generated yet. Use the form above to create an API key.
              </Typography>
            </Box>
          )}

          <Typography variant="h6" style={{ marginTop: 24, marginBottom: 16 }}>Usage Examples:</Typography>
          <Tabs
            value={tabIndex}
            onChange={(_, newIndex) => setTabIndex(newIndex)}
            indicatorColor="primary"
            textColor="primary"
            style={{ marginBottom: 16 }}
          >
            <Tab label="Python OpenAI" />
            <Tab label="Python Langchain" />
            <Tab label="JS Langchain" />
            <Tab label="cURL" />
          </Tabs>
          <Box position="relative">
            <pre style={{ outline: '1px solid #aaa', padding: 16, overflow: 'auto', backgroundColor: !generatedKey ? 'rgba(0, 0, 0, 0.04)' : 'initial' }}>
              {tabIndex === 0 && codeSamples.pythonOpenAI}
              {tabIndex === 1 && codeSamples.pythonLangchain}
              {tabIndex === 2 && codeSamples.jsLangchain}
              {tabIndex === 3 && codeSamples.curl}
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
            {!generatedKey && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Typography variant="caption" color="textSecondary" style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', padding: '4px 8px', borderRadius: 4 }}>
                  Generate a key to update this example
                </Typography>
              </div>
            )}
          </Box>
        </div>
      </InfoCard>
    </div>
  );
};
