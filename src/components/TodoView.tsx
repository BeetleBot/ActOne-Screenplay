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

export const TodoView: React.FC = () => {
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
    saveTodos(todos.map(t =>
      t.id === id
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined }
        : t
    ));
  };

  const deleteTodo = (id: string) => {
    saveTodos(todos.filter(t => t.id !== id));
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="todo-view">
      <h3 className="todo-title">Tasks</h3>

      <div className="todo-input-wrapper">
        <input
          className="todo-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
          placeholder="Add a task..."
        />
        <button className="todo-add-btn" onClick={addTodo} tabIndex={-1}>
          <Plus size={16} />
        </button>
      </div>

      <div className="todo-list">
        {activeTodos.map(todo => (
          <div key={todo.id} className="todo-item">
            <button className="todo-toggle" onClick={() => toggleTodo(todo.id)} tabIndex={-1}>
              <Circle size={16} />
            </button>
            <span className="todo-text">{todo.text}</span>
          </div>
        ))}
        {activeTodos.length === 0 && (
          <div className="todo-empty">No tasks yet</div>
        )}
      </div>

      {completedTodos.length > 0 && (
        <div className="todo-completed-section">
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
