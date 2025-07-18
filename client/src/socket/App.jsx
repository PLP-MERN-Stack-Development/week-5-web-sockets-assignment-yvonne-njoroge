import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function App() {
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [users, setUsers] = useState([]);
  const [toUserId, setToUserId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    socket.on('receive_message', (msg) => {
      setChat((prev) => [...prev, msg]);
      playSound();
      showBrowserNotification(msg);
      if (!document.hasFocus()) setUnreadCount((count) => count + 1);
    });

    socket.on('private_message', (msg) => {
      setChat((prev) => [...prev, msg]);
    });

    socket.on('user_list', (list) => setUsers(list));
    socket.on('typing_users', (list) => setTypingUsers(list));

    socket.on('connect_error', () => {
      console.log('Connection failed. Retrying...');
    });

    window.addEventListener('focus', () => setUnreadCount(0));

    return () => {
      socket.off('receive_message');
      socket.off('private_message');
      socket.off('user_list');
      socket.off('typing_users');
    };
  }, []);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    socket.emit('user_join', username);
    setIsRegistered(true);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const msgData = {
      message,
      timestamp: Date.now(),
      to: toUserId,
    };

    if (toUserId) {
      socket.emit('private_message', msgData);
    } else {
      socket.emit('send_message', msgData);
    }

    setMessage('');
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', e.target.value.length > 0);
  };

  const playSound = () => {
    const audio = new Audio('/notification.mp3'); // Add this file in public/
    audio.play().catch(() => {});
  };

  const showBrowserNotification = (msg) => {
    if (Notification.permission === 'granted') {
      new Notification(`${msg.sender}`, {
        body: msg.message,
      });
    }
  };

  const filteredChat = chat.filter((msg) =>
    msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isRegistered) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-2">Enter your name</h2>
        <form onSubmit={handleRegister}>
          <input
            className="border p-2 mr-2"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button className="bg-blue-500 text-white px-4 py-2">Join</button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-2">
        👋 Hi, {username} {unreadCount > 0 && <span className="text-red-500">({unreadCount} new)</span>}
      </h1>

      <div className="mb-3">
        <input
          type="text"
          placeholder="🔍 Search messages"
          className="border px-2 py-1 w-full mb-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <h2 className="font-semibold">Online Users</h2>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              <button
                className={`underline ${user.id === toUserId ? 'text-blue-500' : ''}`}
                onClick={() => setToUserId(toUserId === user.id ? null : user.id)}
                disabled={user.username === username}
              >
                {user.username} {user.username === username && '(You)'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div ref={chatBoxRef} className="border h-64 overflow-y-auto p-2 mb-2">
        {filteredChat.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.sender}</strong> [{new Date(msg.timestamp).toLocaleTimeString()}]
            {msg.isPrivate && <span className="text-red-500"> (Private)</span>}: {msg.message}
          </div>
        ))}
      </div>

      {typingUsers.length > 0 && (
        <div className="text-sm text-gray-500 mb-2">
          {typingUsers.filter((u) => u !== username).join(', ')} typing...
        </div>
      )}

      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={message}
          onChange={handleTyping}
          placeholder="Type a message..."
          className="border p-2 w-full mb-2"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2">Send</button>
      </form>
    </div>
  );
}

export default App;
