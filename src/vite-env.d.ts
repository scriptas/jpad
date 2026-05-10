/// <reference types="vite/client" />

interface Window {
  AndroidStatusBar?: {
    setStyle(dark: boolean): void;
  };
  AndroidNavigation?: {
    closeApp(): void;
  };
}
