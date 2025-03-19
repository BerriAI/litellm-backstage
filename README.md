# Backstage application using `@litellm/plugin-litellm`

You are currently at the root of the repository, this is the backstage app showing the plugin in action.

# See plugin code in the [`plugins/litellm`](plugins/litellm) directory

# LiteLLM Plugin for Backstage

This plugin integrates LiteLLM key management functionality into your Backstage instance, allowing users to generate and manage API keys for LiteLLM services directly from the Backstage UI.

https://youtu.be/V9RXk5SJcCo

![image](https://github.com/user-attachments/assets/bcd3daed-029c-42c0-90d6-43996d7bf127)

## Requirements

- LiteLLM instance
- Backstage instance with microsoft auth provider configured.

## Features

- Generate LiteLLM API keys with custom names
- Team and budget verification
- Instant code samples for different programming languages
- Automatic user creation in LiteLLM (using `Azure Active Directory` email format as the `user_id`)

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
    baseUrl: 'https://your-litellm-instance.com' # URL to your LiteLLM instance
    adminKey: 'your-organization-api-key' # Your LiteLLM admin/organization API key
    teamId: 'your-team-id' # Your LiteLLM team ID
    budgetId: 'your-budget-id' # Your LiteLLM budget ID
    maxBudgetPerUser: 5 # Maximum budget per user
```

## Adding to your Backstage application

### Add the plugin to your app

Add the LiteLLM page to your Backstage application by modifying your `packages/app/src/App.tsx` file:

```tsx
import { LitellmPage } from '@litellm/plugin-litellm';

// Inside your App component's route definitions:
<Route path="/litellm" element={<LitellmPage />} />;
```

### Add a navigation item (optional)

Modify your `packages/app/src/components/Root/Root.tsx` to add a navigation item:

```tsx
import SmartToyIcon from '@material-ui/icons/Train';

// Inside your sidebar items:
<SidebarItem icon={SmartToyIcon} to="litellm" text="LiteLLM Keys" />;
```

## Usage

Once installed and configured, users can:

1. Navigate to the LiteLLM page
2. Enter a name for their API key
3. Generate a key
4. Use provided code samples to integrate with their applications

## License

Apache-2.0

## Additional Resources

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Backstage Plugin Documentation](https://backstage.io/docs/plugins/)
