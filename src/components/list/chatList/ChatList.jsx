import { useEffect, useState } from "react";
import "./chatList.css";
import AddUser from "./addUser/addUser";
import { useUserStore } from "../../../lib/userStore";
import { ref, onValue, update } from "firebase/database";
import { realtimeDb } from "../../../lib/firebase";
import { useChatStore } from "../../../lib/chatStore";
import useUserPresence from "./useUserPresence";

const ChatList = () => {
  useUserPresence(); // Track user presence
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");

  const { currentUser } = useUserStore();
  const { chatId, changeChat } = useChatStore();

  useEffect(() => {
    const userChatsRef = ref(realtimeDb, `userchats/${currentUser.id}`);
    const unSub = onValue(userChatsRef, async (snapshot) => {
      const items = snapshot.val()?.chats || [];
      console.log("items  ", items);
      // Convert items object to an array of chat objects
      const itemsArray = Object.entries(items).map(([key, value]) => {
        console.log("key", key, value);
        return {
          chatId: key, // Include the key
          ...value, // Spread the value object
        };
      });

      const promises = itemsArray.map(async (item) => {
        const userRef = ref(realtimeDb, `users/${item.receiverId}`);
        const userSnapshot = await new Promise((resolve, reject) => {
          onValue(userRef, (snap) => resolve(snap), reject, { onlyOnce: true });
        });

        const user = userSnapshot.val();

        // Subscribe to user presence status changes
        const userStatusRef = ref(realtimeDb, `status/${item.receiverId}`);
        onValue(userStatusRef, (snapshot) => {
          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.receiverId === item.receiverId
                ? { ...chat, status: snapshot.val()?.state }
                : chat
            )
          );
        });

        return { ...item, user };
      });

      const chatData = await Promise.all(promises);
      setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
    });

    return () => {
      unSub();
    };
  }, [currentUser.id]);

  const handleSelect = async (chat) => {
    const userChats = chats.map((item) => {
      const { user, ...rest } = item;
      return rest;
    });

    const chatIndex = userChats.findIndex(
      (item) => item.chatId === chat.chatId
    );

    userChats[chatIndex].isSeen = true;
    const userChatsRef = ref(realtimeDb, `userchats/${currentUser.id}`);

    try {
      await update(userChatsRef, {
        chats: userChats, // Update chats in Realtime Database
      });
      console.log("here is chat updated", chat);
      changeChat(chat.chatId, chat.user); // Update current chat in application state
    } catch (err) {
      console.log(err);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.user.username.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="" />
          <input
            type="text"
            placeholder="Search"
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt=""
          className="add"
          onClick={() => setAddMode((prev) => !prev)}
        />
      </div>
      {filteredChats.map((chat) => (
        <div
          className="item"
          key={chat.chatId}
          onClick={() => handleSelect(chat)}
          style={{
            backgroundColor: chat?.isSeen ? "transparent" : "#5183fe",
          }}
        >
          <img src={chat.user.avatar || "./avatar.png"} alt="" />
          <div className="texts">
            <span>{chat.user.username}</span>
            <span className={chat.status === "online" ? "online" : "offline"}>
              {chat.status === "online" ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      ))}

      {addMode && <AddUser />}
    </div>
  );
};

export default ChatList;
