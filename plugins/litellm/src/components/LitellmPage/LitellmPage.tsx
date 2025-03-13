// plugins/litellm/src/components/LitellmPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Button,
  TextField,
  Typography,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  CircularProgress,
} from '@material-ui/core';
import { useApi, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { CopyTextButton } from '@backstage/core-components';
import { InfoCard } from '@backstage/core-components';

type LitellmConfig = {
  baseUrl: string;
  adminKey: string;
  teamId: string;
  budgetId: string;
  maxBudgetPerUser: number;
}

export const LitellmPage = () => { 
  const config = useApi(configApiRef);
  const litellmConfig: LitellmConfig = config.get('app.litellm');
  console.log('litellmConfig', litellmConfig);
  if (!litellmConfig || !litellmConfig.baseUrl || !litellmConfig.adminKey || !litellmConfig.teamId || !litellmConfig.budgetId || !litellmConfig.maxBudgetPerUser) {
    throw new Error('LiteLLM config is not set');
  }
  const baseUrl = litellmConfig.baseUrl;
  const adminKey = litellmConfig.adminKey;
  const teamId = litellmConfig.teamId;
  const budgetId = litellmConfig.budgetId;
  const maxBudgetPerUser = litellmConfig.maxBudgetPerUser;

  // Component state
  const [keyAlias, setKeyAlias] = useState<string>('');
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [userId, setUserId] = useState<string>('');
  const identityApi = useApi(identityApiRef);
  
  // Parse the email from Azure AD format to get a clean user ID
  const parseAzureAdEmail = (email: string): string => {
    if (email.includes('#EXT#')) {
      const emailPart = email.split('#EXT#')[0];
      return emailPart
    }
    return email;
  };

  // Fetch user email from Backstage identity
  const fetchUserEmail = async () => {
    try {
      const identity = await identityApi.getProfileInfo();
      if (!identity || !identity.email) {
        throw new Error('User email not found');
      }
      return parseAzureAdEmail(identity.email);
    } catch (error) {
      console.error('Error fetching identity token:', error);
      return 'FALLBACK_USER_EMAIL';
    }
  };

  // Check if user exists in LiteLLM
  const checkUserExists = async (userEmail: string): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/user/get_users?user_ids=${encodeURIComponent(userEmail)}&page=1&page_size=25`, {
        headers: {
          'accept': 'application/json',
          'x-goog-api-key': adminKey,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check user: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('User check data: ', data);
      return data.users && data.users.length > 0;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  };

  // Create a new user in LiteLLM
  const createUser = async (userEmail: string): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/user/new`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-goog-api-key': adminKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_budget: maxBudgetPerUser,
          user_id: userEmail,
          team_id: teamId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Created user data: ', data);
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  };

  // Initialize user in LiteLLM
  useEffect(() => {
    const initializeUser = async () => {
      setIsInitializing(true);
      try {
        const userEmail = await fetchUserEmail();
        setUserId(userEmail);
        
        // Check if user exists, create if not
        const exists = await checkUserExists(userEmail);
        if (!exists) {
          const created = await createUser(userEmail);
          if (!created) {
            setErrorMessage('Failed to create user in LiteLLM');
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        setErrorMessage('Failed to initialize user');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeUser();
  }, [identityApi]);

  // Submit key options and generate API key with additional fields.
  const handleSubmitKeyOptions = async () => {
    setErrorMessage('');
    
    // Validate key alias
    if (!keyAlias) {
      setErrorMessage('Please provide a key name.');
      return;
    }

    setIsGenerating(true);
    try {
      const requestBody = {
        key_alias: keyAlias,
        user_id: userId,
        team_id: teamId,
        budget_id: budgetId
      };
      
      // Call /key/generate with user details
      const response = await fetch(`${baseUrl}/key/generate`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-goog-api-key': adminKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const status = response.status;
        if (status === 400) {
          throw new Error(`Failed to generate key: ${status} Bad Request - This might be due to a duplicate key name. Please try a different name.`);
        } else if (status === 500) {
          throw new Error(`Failed to generate key: ${status} Internal Server Error`);
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
from langchain.schema import HumanMessage, SystemMessage

chat = ChatOpenAI(
    openai_api_key="${generatedKey || '<your-generated-key>'}",
    openai_api_base="${baseUrl}",  # set openai_api_base to the LiteLLM Proxy
    model="gpt-3.5-turbo",
    temperature=0.1,
)

messages = [
    SystemMessage(content="You are a helpful assistant."),
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

  const getCodeSampleForTab = (index: number): string => {
    switch(index) {
      case 0: return codeSamples.pythonOpenAI;
      case 1: return codeSamples.pythonLangchain;
      case 2: return codeSamples.jsLangchain;
      default: return codeSamples.curl;
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <Typography variant="h4" gutterBottom>LiteLLM Key Manager</Typography>

      {isInitializing ? (
        <Box display="flex" flexDirection="column" alignItems="center" p={4}>
          <CircularProgress />
          <Typography variant="body1" style={{ marginTop: 16 }}>
            Initializing your LiteLLM account...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Key generation section */}
          <InfoCard title="Generate API Key">
            <div style={{ paddingRight: 16, paddingLeft: 16 }}>
              <TextField 
                label="Key Name" 
                variant="outlined" 
                fullWidth 
                value={keyAlias} 
                onChange={e => setKeyAlias(e.target.value)} 
                margin="normal"
                helperText="Enter a name for your key"
                error={!!errorMessage && !keyAlias}
              />
              
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
                    text={getCodeSampleForTab(tabIndex)}
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
        </>
      )}
    </div>
  );
};
