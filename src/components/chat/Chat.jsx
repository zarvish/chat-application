import { useEffect, useRef, useState } from "react";
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import { ref, onValue, update, push, set, serverTimestamp } from "firebase/database"; 
import { realtimeDb } from "../../lib/firebase"; 
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import upload from "../../lib/upload";
import { format } from "timeago.js";

const Chat = () => {
  const [chat, setChat] = useState(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [img, setImg] = useState({
    file: null,
    url: "",
  });
  const [onlineUsers, setOnlineUsers] = useState([]);

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } = useChatStore();

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  useEffect(() => {
    const chatRef = ref(realtimeDb, `chats/${chatId}`);
    const unSub = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      setChat(data || { messages: [] }); // Ensure messages is an array
    });

    return () => {
      unSub();
    };
  }, [chatId]);

  useEffect(() => {
    const usersRef = ref(realtimeDb, `users`);
    const unSub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const onlineUsersList = [];
      for (const userId in data) {
        if (data[userId].online) {
          onlineUsersList.push(data[userId]);
        }
      }
      setOnlineUsers(onlineUsersList);
    });

    return () => {
      unSub();
    };
  }, []);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  const handleImg = (e) => {
    if (e.target.files[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  const handleSend = async () => {
    if (text === "") return;

    let imgUrl = null;

    try {
      if (img.file) {
        imgUrl = await upload(img.file);
      }

      const newMessage = {
        senderId: currentUser.id,
        text,
        createdAt: new Date().toISOString(),
        status: 'sent',
        ...(imgUrl && { img: imgUrl }),
      };

      // Update the chat messages under the correct chatId
      const chatMessagesRef = ref(realtimeDb, `chats/${chatId}/messages`);
      const newMessageRef = push(chatMessagesRef); // Use push to generate a new key for each message
      await set(newMessageRef, newMessage);

      const userIDs = [currentUser.id, user.id];

      // Updating userchats for each user in Realtime Database
      for (const id of userIDs) {
        const userChatsRef = ref(realtimeDb, `userchats/${id}`);
        const userChatsSnapshot = await new Promise((resolve, reject) => {
          onValue(userChatsRef, (snap) => resolve(snap), reject, { onlyOnce: true });
        });

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.val();
          const chatIndex = userChatsData.chats.findIndex((c) => c.chatId === chatId);

          if (chatIndex !== -1) {
            userChatsData.chats[chatIndex].lastMessage = text;
            userChatsData.chats[chatIndex].isSeen = id === currentUser.id ? true : false;
            userChatsData.chats[chatIndex].updatedAt = Date.now();

            await update(userChatsRef, {
              chats: userChatsData.chats,
            });
          }
        }
      }
    } catch (err) {
      console.log(err);
    } finally {
      setImg({
        file: null,
        url: "",
      });

      setText("");
    }
  };

  useEffect(() => {
    const messagesRef = ref(realtimeDb, `chats/${chatId}/messages`);
    const unSub = onValue(messagesRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageKeys = Object.keys(data);
        for (const key of messageKeys) {
          const message = data[key];
          if (message.senderId !== currentUser.id && message.status === 'sent') {
            await update(ref(realtimeDb, `chats/${chatId}/messages/${key}`), { status: 'delivered' });
          }
        }
      }
    });

    return () => {
      unSub();
    };
  }, [chatId, currentUser.id]);

  useEffect(() => {
    // Set up listener for message status changes to 'read'
    const messagesRef = ref(realtimeDb, `chats/${chatId}/messages`);
    const unSub = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.keys(data).forEach(async (key) => {
          const message = data[key];
          if (message.senderId !== currentUser.id && message.status === 'delivered') {
            await update(ref(realtimeDb, `chats/${chatId}/messages/${key}`), { status: 'read' });
          }
        });
      }
    });

    return () => {
      unSub();
    };
  }, [chatId, currentUser.id]);


  const handleRead = async (messageId) => {
    await update(ref(realtimeDb, `chats/${chatId}/messages/${messageId}`), { status: 'read' });
  };

  const handleMessageClick = (message) => {
    if (message.senderId !== currentUser.id && message.status !== 'read') {
      handleRead(message.createdAt);
    }
  };

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <img src={user?.avatar || "./avatar.png"} alt="" />
          <div className="texts">
            <span>{user?.username}</span>
            <p>Lorem ipsum dolor, sit amet.</p>
          </div>
        </div>
        <div className="icons">
          <img src="./phone.png" alt="" />
          <img src="./video.png" alt="" />
          <img src="./info.png" alt="" />
        </div>
      </div>
     
      <div className="center">
        {!!chat && chat?.messages && Object.values(chat.messages).map((message) => (
          <div
            className={
              message.senderId === currentUser?.id ? "message own" : "message"
            }
            key={message.createdAt}
            onClick={() => handleMessageClick(message)}
          >
            <div className="texts">
              {message.img && <img src={message.img} alt="" />}
              <p>{message.text}</p>
              <span>{format(message.createdAt)}</span>
              <span className="message-status">
                {message.status === 'sent' && '✓'}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'read' && '✓✓ (blue)'}
              </span>
            </div>
          </div>
        ))}
        {img.url && (
          <div className="message own">
            <div className="texts">
              <img src={img.url} alt="" />
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>
      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="./img.png" alt="" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
          />
          <img src="./camera.png" alt="" />
          <img src="./mic.png" alt="" />
        </div>
        <input
          type="text"
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send a message"
              : "Type a message..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        />
        <div className="emoji">
          <img
            src="./emoji.png"
            alt=""
            onClick={() => setOpen((prev) => !prev)}
          />
          <div className="picker">
            <EmojiPicker open={open} onEmojiClick={handleEmoji} />
          </div>
        </div>
        <button
          className="sendButton"
          onClick={handleSend}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
