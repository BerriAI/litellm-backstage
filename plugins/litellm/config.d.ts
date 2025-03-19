export interface Config {
  app: {
    /**
     * Frontend root URL
     * NOTE: Visibility applies to only this field
     * @visibility frontend
     */
    baseUrl: string;

    /**
     * LiteLLM plugin configuration
     * @deepVisibility frontend
     */
    litellm: {
      baseUrl: string;
      adminKey: string;
      teamId: string;
      budgetId: string;
      maxBudgetPerUser: number;
    };
  };
}
