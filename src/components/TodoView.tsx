import React, { useState, useCallback } from "react";
import { Circle, CheckCircle, ChevronDown, Plus, X } from "lucide-react";
import { useAppContext } from "../context/AppContext";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

interface TodoViewProps {
  disabled?: boolean;
  saveFileAs?: () => Promise<string | null>;
}

const ActoneBanner: React.FC<{ saveFileAs?: () => Promise<string | null> }> = ({ saveFileAs }) => (
  <div style={{
    padding: "10px",
    backgroundColor: "rgba(229, 62, 62, 0.08)",
    border: "1px solid rgba(229, 62, 62, 0.3)",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "12px",
    color: "var(--text-main)",
    marginBottom: "8px"
  }}>
    <p style={{ margin: 0, fontWeight: 500, color: "#e53e3e" }}>
      Only available on .actone
    </p>
    <p style={{ margin: 0, fontSize: "11px", opacity: 0.8 }}>
      Tasks require saving the screenplay as an ActOne Bundle (.actone).
    </p>
    {saveFileAs && (
      <button
        onClick={() => saveFileAs()}
        style={{
          backgroundColor: "#e53e3e",
          color: "#ffffff",
          border: "none",
          borderRadius: "4px",
          padding: "6px 12px",
          fontSize: "11px",
          fontWeight: 600,
          cursor: "pointer",
          alignSelf: "flex-start",
          transition: "background-color 0.2s"
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#c53030"}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#e53e3e"}
      >
        Save as .actone
      </button>
    )}
  </div>
);

export const TodoView: React.FC<TodoViewProps> = ({ disabled, saveFileAs }) => {
  const { parsedDoc, updateSettings } = useAppContext();
  const [input, setInput] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);

  const todos: Todo[] = parsedDoc.settings?.todos || [];

  const saveTodos = useCallback((newTodos: Todo[]) => {
    updateSettings((prev: any) => ({
      ...prev,
      todos: newTodos,
    }));
  }, [updateSettings]);

  const addTodo = () => {
    if (disabled) return;
    const text = input.trim();
    if (!text) return;
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    saveTodos([...todos, newTodo]);
    setInput("");
  };

  const toggleTodo = (id: string) => {
    if (disabled) return;
    saveTodos(todos.map(t =>
      t.id === id
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined }
        : t
    ));
  };

  const deleteTodo = (id: string) => {
    if (disabled) return;
    saveTodos(todos.filter(t => t.id !== id));
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="todo-view">
      <h3 className="todo-title">Tasks</h3>

      {disabled && <ActoneBanner saveFileAs={saveFileAs} />}

      <div className="todo-input-wrapper" style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
        <input
          className="todo-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
          placeholder={disabled ? "Save as .actone to use tasks" : "Add a task..."}
        />
        <button className="todo-add-btn" onClick={addTodo} tabIndex={-1}>
          <Plus size={16} />
        </button>
      </div>

      <div className="todo-list" style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
        {activeTodos.map(todo => (
          <div key={todo.id} className="todo-item">
            <button className="todo-toggle" onClick={() => toggleTodo(todo.id)} tabIndex={-1}>
              <Circle size={16} />
            </button>
            <span className="todo-text">{todo.text}</span>
          </div>
        ))}
        {activeTodos.length === 0 && (
          <div className="todo-empty">{disabled ? "" : "No tasks yet"}</div>
        )}
      </div>

      {completedTodos.length > 0 && (
        <div className="todo-completed-section" style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
          <button
            className="todo-completed-header"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <ChevronDown
              size={14}
              style={{ transform: showCompleted ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}
            />
            <span>Completed</span>
            <span className="todo-completed-count">{completedTodos.length}</span>
          </button>
          {showCompleted && (
            <div className="todo-completed-list">
              {completedTodos.map((todo, idx) => (
                <div key={todo.id} className="todo-completed-item">
                  <div className="todo-graph-line">
                    {idx < completedTodos.length - 1 && <div className="todo-graph-connector" />}
                    <div className="todo-graph-dot" />
                  </div>
                  <button className="todo-toggle" onClick={() => toggleTodo(todo.id)} tabIndex={-1}>
                    <CheckCircle size={16} />
                  </button>
                  <span className="todo-text todo-done">{todo.text}</span>
                  <button className="todo-delete" onClick={() => deleteTodo(todo.id)} tabIndex={-1}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
