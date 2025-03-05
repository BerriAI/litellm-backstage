
export interface Config {
  app: {
    /**
     * Frontend root URL
     * NOTE: Visibility applies to only this field
     * @visibility frontend
     */
    baseUrl: string;

    /**
     * Some custom complex type
     * NOTE: Visibility applies recursively downward
     * This is particularly useful for complex types like durations
     * @visibility frontend
     */
    customSchedule: string;
  };
}