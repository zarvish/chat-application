import { ref, get } from "firebase/database";
import { create } from "zustand";
import { realtimeDb } from "./firebase";

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,
  fetchUserInfo: async (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {
      const userRef = ref(realtimeDb, `users/${uid}`);
      const userSnap = await get(userRef);


      if (userSnap.exists()) {
        set({ currentUser: userSnap.val(), isLoading: false });
      } else {
        set({ currentUser: null, isLoading: false });
      }
    } catch (err) {
      console.log(err);
      return set({ currentUser: null, isLoading: false });
    }
  },
}));
