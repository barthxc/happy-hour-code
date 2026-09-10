import React, { useEffect, useRef, useState } from "react";
import { useNotificationSound } from "./useNotificationSound";

const vscode = window.acquireVsCodeApi
  ? window.acquireVsCodeApi()
  : { postMessage: () => {}, setState: () => {}, getState: () => undefined };

type User = {
  id: string;
  name: string | null;
};

type Message = {
  role: "user" | "bot" | "system";
  content: string;
  name?: string;
  from?: string;
};

export default function App() {
  const [room, setRoom] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState("");
  const [username, setUsername] = useState<string>("");
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Invocamos el Hook modular de sonido pasándole el estado local
  const playNotificationSound = useNotificationSound(soundEnabled);

  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Recuperar memoria local de VS Code al reabrir el sidebar
  useEffect(() => {
    const saved = vscode.getState && vscode.getState();
    if (saved && typeof saved === "object") {
      if (saved.room) setRoom(saved.room);
      if (saved.username) setUsername(saved.username);
      if (Array.isArray(saved.messages)) setMessages(saved.messages);
      if (Array.isArray(saved.users)) setUsers(saved.users);
      if (typeof saved.soundEnabled === "boolean")
        setSoundEnabled(saved.soundEnabled);
    }
  }, []);

  // Persistir estado localmente en el caché de VS Code
  useEffect(() => {
    if (room && username) {
      vscode.setState({ room, username, messages, users, soundEnabled });
    }
  }, [room, username, messages, users, soundEnabled]);

  // Avisar al backend de que el frontend está listo
  useEffect(() => {
    vscode.postMessage({ type: "ready" });
  }, []);

  // Escuchar mensajes provenientes de la extensión (extension.ts)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "reset" || data.type === "clearStaleState") {
        setRoom(null);
        setUsername("");
        setMessages([]);
        setUsers([]);
        setInput("");
        setRoomInput("");
        setUsernameInput("");
        setConnecting(false);
        setFormError(null);
        vscode.setState(null);
      } else if (data.type === "joined") {
        setRoom(data.room);
        setUsername(data.username);
        setConnecting(false);
        setFormError(null);
        setUsers([]);
        vscode.setState({
          room: data.room,
          username: data.username,
          messages: [],
          users: [],
          soundEnabled,
        });
        setMessages([
          {
            role: "system",
            content: `Te has unido a la sala '${data.room}' como '${data.username}'.`,
          },
        ]);
      } else if (data.type === "room-users") {
        setUsers((prevUsers) => {
          const newUsers: User[] = data.users || data.payload?.users || [];
          if (prevUsers.length && newUsers.length > prevUsers.length) {
            const joined = newUsers.find(
              (u) => !prevUsers.some((p) => p.id === u.id),
            );
            if (joined && joined.name !== data.payload?.username) {
              setMessages((msgs) => [
                ...msgs,
                {
                  role: "system",
                  content: `${joined.name} ha entrado a la sala`,
                },
              ]);
            }
          }
          if (prevUsers.length && newUsers.length < prevUsers.length) {
            const left = prevUsers.find(
              (u) => !newUsers.some((n) => n.id === u.id),
            );
            if (left) {
              setMessages((msgs) => [
                ...msgs,
                {
                  role: "system",
                  content: `${left.name} ha salido de la sala`,
                },
              ]);
            }
          }
          return newUsers;
        });
      } else if (data.type === "system") {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: data.content },
        ]);
      } else if (data.type === "chat") {
        // FILTRO DE AUDIO: Solo reproduce el sonido si el mensaje es externo Y el backend indica que playSound es true
        const isBot = (data.role || "bot") !== "user";
        if (isBot && data.playSound) playNotificationSound();

        setMessages((prev) => [
          ...prev,
          { role: data.role || "bot", content: data.message, name: data.name },
        ]);
        setConnecting(false);
      } else if (data.type === "restoreState") {
        const state = data.payload;
        if (state && state.room && state.username) {
          setRoom(state.room);
          setUsername(state.username);
          const bienvenida = {
            role: "system",
            content: `Te has unido a la sala '${state.room}' como '${state.username}'.`,
          } as Message;

          const msgs = state.messages || [];
          setMessages([bienvenida, ...msgs]);
          setUsers(state.users || []);
        }
      } else if (data.type === "room-closed") {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `La sala ha sido cerrada por el servidor.`,
          },
        ]);
        setRoom(null);
        setConnecting(false);
      } else if (data.type === "error") {
        const errorText =
          data.message ||
          data.payload?.message ||
          data.payload?.error ||
          "Error del servidor";
        const isFatal =
          typeof errorText === "string" &&
          errorText.toLowerCase().includes("exist");

        if (!room || isFatal) {
          setRoom(null);
          setUsername("");
          setMessages([]);
          setUsers([]);
          setFormError(errorText);
          vscode.setState(null);

          if (isFatal) {
            vscode.postMessage({ type: "leave" });
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "system", content: `Error: ${errorText}` },
          ]);
        }
        setConnecting(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [room]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Notificar al backend para limpiar la burbuja roja de mensajes no leídos
  const handleClearBadge = () => {
    vscode.postMessage({ type: "clearBadge" });
  };

  const handleRoomAction =
    (action: "join" | "create") => (e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      if (!roomInput.trim() || !usernameInput.trim()) return;
      setConnecting(true);
      setFormError(null);
      setRoom(null);
      setMessages([]);
      setUsers([]);
      vscode.setState(null);
      vscode.postMessage({
        type: action,
        room: roomInput.trim(),
        username: usernameInput.trim(),
      });
    };

  const handleLeaveRoom = () => {
    vscode.postMessage({ type: "leave" });
    setRoom(null);
    setUsername("");
    setMessages([]);
    setUsers([]);
    setFormError(null);
    vscode.setState(null);
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (trimmed === "/clear") {
      setMessages([]);
      setInput("");
      return;
    }
    if (trimmed === "/leave") {
      handleLeaveRoom();
      return;
    }
    if (trimmed === "/users") {
      const userList = users.map((u) => u.name || "Anónimo").join(", ");
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `👥 Usuarios en sala: ${userList}` },
      ]);
      setInput("");
      return;
    }

    vscode.postMessage({ type: "chat", message: trimmed });
    setInput("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
  };

  const textBeforeCursor = input.slice(0, cursorPos);
  const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const filteredUsers =
    mentionQuery !== null
      ? users.filter(
          (u) =>
            u.name &&
            u.name.toLowerCase().includes(mentionQuery) &&
            u.name !== username,
        )
      : [];

  const handleMentionSelect = (selectedName: string) => {
    if (!mentionMatch) return;
    const start = textBeforeCursor.lastIndexOf("@");
    const end = cursorPos;
    const newValue =
      input.slice(0, start) + `@${selectedName} ` + input.slice(end);
    setInput(newValue);
    if (inputRef.current) inputRef.current.focus();
  };

  if (!room) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
          maxWidth: "100vw",
          background: "var(--vscode-sideBar-background)",
          color: "var(--vscode-sideBar-foreground)",
          position: "relative",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}>
        <button
          onClick={() => vscode.postMessage({ type: "reset" })}
          title="Resetear extensión"
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            background: "none",
            color: "var(--vscode-icon-foreground)",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            padding: 2,
            opacity: 0.7,
            transition: "opacity 0.2s",
          }}>
          ⟳
        </button>
        <div
          style={{
            fontWeight: 700,
            fontSize: 22,
            color: "var(--vscode-sideBarTitle-foreground)",
            letterSpacing: 0.5,
            textAlign: "center",
            margin: "32px 0 24px 0",
            userSelect: "none",
          }}>
          Momentum
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: "100%",
            maxWidth: 340,
            margin: "0 auto",
            padding: "0 12px",
            boxSizing: "border-box",
            overflowX: "hidden",
          }}>
          <input
            style={{
              padding: 10,
              borderRadius: 4,
              border: "1px solid var(--vscode-input-border)",
              background: "var(--vscode-input-background)",
              color: "var(--vscode-input-foreground)",
              fontSize: 15,
              width: "100%",
              boxSizing: "border-box",
              boxShadow: "var(--vscode-widget-shadow)",
              outline: "none",
            }}
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Nombre de usuario"
            autoFocus
            disabled={connecting}
          />
          <input
            style={{
              padding: 10,
              borderRadius: 4,
              border: "1px solid var(--vscode-input-border)",
              background: "var(--vscode-input-background)",
              color: "var(--vscode-input-foreground)",
              fontSize: 15,
              width: "100%",
              boxSizing: "border-box",
              boxShadow: "var(--vscode-widget-shadow)",
              outline: "none",
            }}
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            placeholder="Nombre de la sala"
            disabled={connecting}
          />

          {formError && (
            <div
              style={{
                color: "var(--vscode-errorForeground, #f48771)",
                background: "rgba(244, 135, 113, 0.1)",
                padding: "10px",
                borderRadius: "4px",
                fontSize: "14px",
                textAlign: "center",
                border: "1px solid rgba(244, 135, 113, 0.2)",
                fontWeight: 500,
                lineHeight: "1.4",
              }}>
              ⚠️ {formError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: "100%",
            }}>
            <button
              type="button"
              onClick={handleRoomAction("create")}
              style={{
                marginTop: 12,
                background: "var(--vscode-button-background)",
                color: "var(--vscode-button-foreground)",
                border: "none",
                borderRadius: 4,
                padding: "12px 0",
                fontWeight: 600,
                cursor: connecting ? "not-allowed" : "pointer",
                fontSize: 15,
                transition: "background 0.2s",
                width: "100%",
                boxSizing: "border-box",
                opacity: connecting ? 0.7 : 1,
              }}
              disabled={connecting}>
              {connecting ? "Conectando..." : "Crear sala"}
            </button>
            <button
              type="button"
              onClick={handleRoomAction("join")}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 4,
                background: "var(--vscode-button-secondaryBackground)",
                color: "var(--vscode-button-secondaryForeground)",
                border: "none",
                fontWeight: 600,
                fontSize: 15,
                boxShadow: "var(--vscode-widget-shadow)",
                cursor: connecting ? "not-allowed" : "pointer",
                transition: "background 0.2s",
                opacity: connecting ? 0.7 : 1,
              }}
              disabled={connecting}>
              {connecting ? "Conectando..." : "Unirse a sala"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--vscode-sideBar-background)",
        boxSizing: "border-box",
        position: "relative",
      }}>
      {/* 🔝 BARRA SUPERIOR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: 8,
          background: "var(--vscode-editorWidget-background)",
          borderBottom: "1px solid var(--vscode-sideBar-border)",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span
            style={{
              color: "var(--vscode-sideBarTitle-foreground)",
              fontWeight: 600,
              fontSize: 15,
            }}>
            Sala: {room}
          </span>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowUsers((prev) => !prev);
              setShowSettings(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              opacity: 0.8,
              fontSize: 13,
            }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ opacity: 0.8 }}>
              <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
            </svg>
            {users.length}
          </div>
        </div>

        {/* Botón Ajustes */}
        <button
          onClick={() => {
            setShowSettings(!showSettings);
            setShowUsers(false);
          }}
          title="Ajustes"
          style={{
            background: "none",
            color: "var(--vscode-icon-foreground)",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            padding: 4,
            opacity: showSettings ? 1 : 0.7,
          }}>
          ⚙️
        </button>
        <button
          onClick={handleLeaveRoom}
          title="Salir de la sala"
          style={{
            background: "none",
            color: "var(--vscode-icon-foreground)",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            padding: 4,
          }}>
          Salir
        </button>
      </div>

      {/* POPOVER AJUSTES */}
      {showSettings && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 42,
            right: 50,
            background: "var(--vscode-editorWidget-background)",
            border: "1px solid var(--vscode-sideBar-border)",
            borderRadius: 6,
            padding: 12,
            minWidth: 160,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 100,
          }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
              color: "var(--vscode-foreground)",
              opacity: 0.8,
            }}>
            Ajustes locales
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
            }}>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            Sonido de mensajes
          </label>
        </div>
      )}

      {/* POPOVER USUARIOS */}
      {showUsers && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 42,
            right: 10,
            background: "var(--vscode-editorWidget-background)",
            border: "1px solid var(--vscode-sideBar-border)",
            borderRadius: 6,
            padding: 8,
            minWidth: 140,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 100,
          }}>
          {users.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Sin usuarios</div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                style={{ fontSize: 13, padding: "4px 6px", borderRadius: 4 }}>
                {u.name || "Anónimo"}
                {u.name === username ? " (tú)" : ""}
              </div>
            ))
          )}
        </div>
      )}

      {connecting && (
        <div
          style={{
            background: "#222",
            color: "#4fc3f7",
            textAlign: "center",
            padding: 8,
            fontWeight: 600,
            fontSize: 15,
          }}>
          Conectando...
        </div>
      )}

      {/* 💬 AREA DE CHAT */}
      <div
        ref={chatRef}
        onClick={() => {
          setShowSettings(false);
          setShowUsers(false);
          handleClearBadge();
        }}
        style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {messages.map((msg, i) => {
          const isOwn = msg.role === "user";

          if (msg.role === "system") {
            return (
              <div
                key={i}
                style={{
                  margin: "8px 0",
                  color: "#b0b0b0",
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: 14,
                  textAlign: "center",
                  opacity: 0.85,
                }}>
                {msg.content}
              </div>
            );
          }

          // Resaltado de Mención
          const isMentioned = !isOwn && msg.content.includes(`@${username}`);

          return (
            <div
              key={i}
              style={{
                margin: "8px 0",
                textAlign: isOwn ? "right" : "left",
                display: "flex",
                flexDirection: "column",
                alignItems: isOwn ? "flex-end" : "flex-start",
              }}>
              <span
                style={{
                  background: isOwn
                    ? "#4fc3f7"
                    : isMentioned
                      ? "var(--vscode-editor-findMatchHighlightBackground, rgba(234, 92, 0, 0.33))"
                      : "#222",
                  color: isOwn ? "#181818" : "#fff",
                  border: isMentioned
                    ? "1px solid var(--vscode-editor-findMatchBorder, #ea5c00)"
                    : "1px solid transparent",
                  borderRadius: 8,
                  padding: "6px 12px",
                  maxWidth: "80%",
                  fontWeight: isOwn ? 600 : 400,
                }}>
                <b>{isOwn ? "Tú" : msg.name || "Otro"}</b>: {msg.content}
              </span>
            </div>
          );
        })}
      </div>

      {/* ✍️ CONTENEDOR DE ENTRADA CON SELECTOR DE MENCIONES */}
      <div style={{ position: "relative", background: "#222" }}>
        {/* Autocompletado flotante */}
        {mentionQuery !== null && filteredUsers.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              width: "100%",
              background: "var(--vscode-editorWidget-background)",
              borderTop: "1px solid var(--vscode-widget-border)",
              boxShadow: "0 -4px 10px rgba(0,0,0,0.3)",
              maxHeight: 150,
              overflowY: "auto",
              zIndex: 10,
            }}>
            <div style={{ fontSize: 11, opacity: 0.6, padding: "4px 8px" }}>
              Mencionar usuario:
            </div>
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => handleMentionSelect(u.name as string)}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background =
                    "var(--vscode-list-hoverBackground)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }>
                @{u.name}
              </div>
            ))}
          </div>
        )}

        <form
          style={{ display: "flex", borderTop: "1px solid #333", padding: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}>
          <input
            ref={inputRef}
            onFocus={handleClearBadge}
            style={{
              flex: 1,
              padding: 8,
              background: "#222",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 14,
            }}
            value={input}
            onChange={handleInputChange}
            placeholder="Escribe un mensaje o usa /comandos..."
            disabled={connecting}
          />
        </form>
      </div>
    </div>
  );
}
