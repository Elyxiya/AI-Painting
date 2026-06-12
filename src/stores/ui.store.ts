import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type UIState } from '@/shared/types';

interface UIStore extends UIState {
  // Language
  setLanguage: (language: 'zh-CN' | 'en-US') => void;

  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Sidebar
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarActiveTab: (tab: 'layers' | 'tools' | 'properties') => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      theme: 'dark',
      sidebar: {
        visible: true,
        width: 280,
        activeTab: 'layers',
      },

      setLanguage: (language) => {
        set({ language });
      },

      setTheme: (theme) => {
        set({ theme });
      },

      toggleSidebar: () => {
        set((state) => ({
          sidebar: { ...state.sidebar, visible: !state.sidebar.visible },
        }));
      },

      setSidebarVisible: (visible) => {
        set((state) => ({
          sidebar: { ...state.sidebar, visible },
        }));
      },

      setSidebarWidth: (width) => {
        set((state) => ({
          sidebar: { ...state.sidebar, width: Math.max(200, Math.min(500, width)) },
        }));
      },

      setSidebarActiveTab: (tab) => {
        set((state) => ({
          sidebar: { ...state.sidebar, activeTab: tab },
        }));
      },
    }),
    {
      name: 'ai-painting-ui',
    },
  ),
);
