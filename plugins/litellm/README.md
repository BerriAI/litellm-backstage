# LiteLLM Plugin for Backstage

This plugin integrates LiteLLM key management functionality into your Backstage instance, allowing users to generate and manage API keys for LiteLLM services directly from the Backstage UI.

https://youtu.be/V9RXk5SJcCo

![image](https://github.com/user-attachments/assets/bcd3daed-029c-42c0-90d6-43996d7bf127)


## Features

- Generate LiteLLM API keys with custom names
- Support for budget/profile selection for generated keys
- Configurable budget requirement setting
- Instant code samples for different programming languages
- Copy-to-clipboard functionality for keys and code samples

## Installation

From your Backstage root directory:
```bash
yarn add --cwd packages/app @litellm/plugin-litellm
```

## Configuration

Add the following to your `app-config.yaml`:
```yaml
app:
  litellm:
    apiKey: 'your-organization-api-key' # Your LiteLLM admin/organization API key
    baseUrl: 'https://your-litellm-instance.com' # URL to your LiteLLM instance
    budgetRequired: false # Set to true if budget selection should be mandatory
```

## Adding to your Backstage application

### Add the plugin to your app

Add the LiteLLM page to your Backstage application by modifying your `packages/app/src/App.tsx` file:

```tsx
import { LitellmPage } from '@litellm/plugin-litellm';

// Inside your App component's route definitions:
<Route path="/litellm" element={<LitellmPage />} />
```

### Add a navigation item (optional)

Modify your `packages/app/src/components/Root/Root.tsx` to add a navigation item:

```tsx
import SmartToyIcon from '@material-ui/icons/Train';

// Inside your sidebar items:
<SidebarItem icon={SmartToyIcon} to="litellm" text="LiteLLM Keys" />
```

## Usage

Once installed and configured, users can:

1. Navigate to the LiteLLM page
2. Enter a name for their API key
3. Select a budget/profile (if applicable)
4. Generate a key
5. Copy the generated key
6. Use provided code samples to integrate with their applications

## License

Apache-2.0

## Additional Resources

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Backstage Plugin Documentation](https://backstage.io/docs/plugins/)
