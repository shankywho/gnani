declare module "@playwright/test" {
  export interface Page {
    goto(url: string): Promise<any>;
    getByRole(role: string, options?: any): any;
    getByPlaceholder(placeholder: string): any;
    getByLabel(label: string): any;
    getByText(text: string | RegExp): any;
    waitForTimeout(ms: number): Promise<void>;
  }

  export interface TestFn {
    (name: string, fn: (args: { page: Page }) => Promise<void>): void;
    skip(condition: boolean | string, reason?: string): void;
    describe(name: string, fn: () => void): void;
  }

  export const test: TestFn;
  export const expect: (actual: any) => any;
}
