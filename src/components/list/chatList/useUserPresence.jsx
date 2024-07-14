import { useEffect } from "react";
import { ref, onValue, set, onDisconnect } from "firebase/database";
import { realtimeDb } from "../../../lib/firebase";
import { useUserStore } from "../../../lib/userStore";

const useUserPresence = () => {
  const { currentUser } = useUserStore();

  useEffect(() => {
    if (!currentUser?.id) return;

    const userStatusRef = ref(realtimeDb, `/status/${currentUser.id}`);
    const isOfflineForDatabase = {
      state: "offline",
      last_changed: new Date().toISOString(),
    };
    const isOnlineForDatabase = {
      state: "online",
      last_changed: new Date().toISOString(),
    };

    // Monitor connection status
    const connectedRef = ref(realtimeDb, ".info/connected");
    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) {
        // If user disconnects
        return;
      }

      // Update user's status on connection
      set(userStatusRef, isOnlineForDatabase);

      // Set user's status to offline on disconnect
      onDisconnect(userStatusRef).set(isOfflineForDatabase);
    });

    return () => {
      // Clean up on unmount or dependency change
      set(userStatusRef, isOfflineForDatabase); // Set user offline when component unmounts
    };
  }, [currentUser?.id]);
};

export default useUserPresence;
