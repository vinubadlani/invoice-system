import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Business } from '../lib/types';

const STORAGE_KEY = 'selectedBusinessId';

interface BusinessState {
  businesses: Business[];
  selectedBusiness: Business | null;
  loading: boolean;
  error: string | null;
  /** Bumped every time the selected business changes, so screens can key off it to drop stale state/refetch. */
  switchToken: number;
  loadBusinesses: () => Promise<void>;
  selectBusiness: (business: Business) => Promise<void>;
  deselectBusiness: () => Promise<void>;
  restoreSelection: () => Promise<void>;
  updateBusiness: (businessId: string, updates: Partial<Business>) => Promise<void>;
  clear: () => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses: [],
  selectedBusiness: null,
  loading: false,
  error: null,
  switchToken: 0,

  loadBusinesses: async () => {
    set({ loading: true, error: null });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ loading: false, businesses: [] });
      return;
    }

    try {
      const data = await api.business.getAll(user.id);
      set({ businesses: data ?? [], loading: false });

      const current = get().selectedBusiness;
      if (current) {
        const fresh = data?.find((b) => b.id === current.id);
        if (fresh) set({ selectedBusiness: fresh });
      }
    } catch (err: any) {
      set({ loading: false, error: err.message ?? 'Failed to load businesses' });
    }
  },

  selectBusiness: async (business) => {
    set({
      selectedBusiness: business,
      switchToken: get().switchToken + 1,
    });
    await AsyncStorage.setItem(STORAGE_KEY, business.id);
  },

  deselectBusiness: async () => {
    set({ selectedBusiness: null, switchToken: get().switchToken + 1 });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  restoreSelection: async () => {
    const storedId = await AsyncStorage.getItem(STORAGE_KEY);
    const { businesses } = get();
    if (storedId) {
      const match = businesses.find((b) => b.id === storedId);
      if (match) {
        set({ selectedBusiness: match });
        return;
      }
    }
    if (businesses.length === 1) {
      set({ selectedBusiness: businesses[0] });
      await AsyncStorage.setItem(STORAGE_KEY, businesses[0].id);
    }
  },

  updateBusiness: async (businessId, updates) => {
    await api.business.update(businessId, updates);
    const [fresh] = await api.business.getById(businessId);
    if (!fresh) return;

    set((state) => ({
      businesses: state.businesses.map((b) => (b.id === businessId ? fresh : b)),
      selectedBusiness: state.selectedBusiness?.id === businessId ? fresh : state.selectedBusiness,
    }));
  },

  clear: () => {
    set({ businesses: [], selectedBusiness: null, error: null, switchToken: get().switchToken + 1 });
    AsyncStorage.removeItem(STORAGE_KEY);
  },
}));
