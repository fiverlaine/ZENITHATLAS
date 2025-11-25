import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TradingSettings } from '../types/trading';

interface SettingsState {
  settings: TradingSettings | null;
  setSettings: (settings: TradingSettings) => void;
}

const defaultSettings: TradingSettings = {
  balance: 100,
  entryPercentage: 2,
  stopLoss: 10,
  profile: 'moderate'
};

const profiles = {
  conservative: {
    entryPercentage: 1,
    stopLoss: 10,
    profile: 'conservative' as const
  },
  moderate: {
    entryPercentage: 20,
    stopLoss: 35,
    profile: 'moderate' as const
  },
  aggressive: {
    entryPercentage: 50,
    stopLoss: 50,
    profile: 'aggressive' as const
  }
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings, // Sempre inicia com valores padrão
      setSettings: (settings) => set({ settings })
    }),
    {
      name: 'trading-settings',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0 || !persistedState || !persistedState.settings) {
          return {
            settings: defaultSettings
          };
        }

        const settings = persistedState.settings;
        const migratedSettings: TradingSettings = {
          balance: Number(settings.balance) || defaultSettings.balance,
          entryPercentage: Number(settings.entryPercentage) || defaultSettings.entryPercentage,
          stopLoss: Number(settings.stopLoss) || defaultSettings.stopLoss,
          profile: settings.profile in profiles ? settings.profile : defaultSettings.profile
        };

        return {
          settings: migratedSettings
        };
      }
    }
  )
);

export const getProfileSettings = (
  profile: TradingSettings['profile'],
  balance: number
): TradingSettings => {
  if (profile === 'custom') {
    return { ...defaultSettings, balance };
  }
  return { ...profiles[profile], balance };
};
