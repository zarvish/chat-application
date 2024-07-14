import "./addUser.css";
import { realtimeDb } from "../../../../lib/firebase";
import { ref, child, get, push, update } from "firebase/database";
import { useState } from "react";
import { useUserStore } from "../../../../lib/userStore";

const AddUser = () => {
  const [user, setUser] = useState(null);

  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get("username");

    try {
      const userRef = ref(realtimeDb, "users");
      const userSnap = await get(userRef);

      if (userSnap.exists()) {
        const users = userSnap.val();
        const userFound = Object.values(users).find((u) => u.username === username);
        console.log('user found', userFound)

        if (userFound) {
          setUser(userFound);
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleAdd = async () => {
    try {
      const chatRef = ref(realtimeDb, "chats");
      const newChatRef = push(chatRef);

      await update(newChatRef, {
        createdAt: Date.now(),
        messages: [],
      });

      const userChatsRef = ref(realtimeDb, "userchats");

      await update(child(userChatsRef, user.id), {
        [`chats/${newChatRef.key}`]: {
          lastMessage: "",
          receiverId: currentUser.id,
          updatedAt: Date.now(),
        },
      });

      await update(child(userChatsRef, currentUser.id), {
        [`chats/${newChatRef.key}`]: {
          lastMessage: "",
          receiverId: user.id,
          updatedAt: Date.now(),
        },
      });
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
        <input type="text" placeholder="Username" name="username" />
        <button>Search</button>
      </form>
      {user && (
        <div className="user">
          <div className="detail">
            <img src={user.avatar || "./avatar.png"} alt="" />
            <span>{user.username}</span>
          </div>
          <button onClick={handleAdd}>Add User</button>
        </div>
      )}
    </div>
  );
};

export default AddUser;
