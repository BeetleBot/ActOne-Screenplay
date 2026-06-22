import React, { useState, useCallback } from "react";
import { useFile, useEditor } from "../context";
import { ActoneBanner } from "./ActoneBanner";
import { RadioButtonUncheckedIcon, CheckCircleIcon, KeyboardArrowDownIcon, AddIcon, CloseIcon } from "./Icons";

import {
  Box,
  Typography,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Collapse,
} from "@mui/material";

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

export const TodoView: React.FC<TodoViewProps> = ({ disabled, saveFileAs }) => {
  const { parsedDoc } = useFile();
  const { updateSettings } = useEditor();
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

  const [activeTodoIdx, setActiveTodoIdx] = useState<number>(-1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (activeTodos.length === 0) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const nextIdx = Math.max(0, Math.min(activeTodos.length - 1, activeTodoIdx + dir));
      setActiveTodoIdx(nextIdx);

      const target = activeTodos[nextIdx];
      const el = e.currentTarget.querySelector(`[data-todo-id="${target.id}"]`) as HTMLElement;
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeTodoIdx >= 0 && activeTodoIdx < activeTodos.length) {
        toggleTodo(activeTodos[activeTodoIdx].id);
      }
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (activeTodoIdx >= 0 && activeTodoIdx < activeTodos.length) {
        deleteTodo(activeTodos[activeTodoIdx].id);
        setActiveTodoIdx(prev => Math.max(-1, Math.min(activeTodos.length - 2, prev)));
      }
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2, gap: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8 }}>
        Tasks
      </Typography>

      {disabled && <ActoneBanner message="Tasks require saving the screenplay as an ActOne Bundle (.actone)." saveFileAs={saveFileAs} />}

      <Box sx={{ display: "flex", gap: 1, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
        <TextField
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
          placeholder={disabled ? "Save as .actone to use tasks" : "Add a task..."}
          size="small"
          fullWidth
          slotProps={{
            input: {
              sx: { borderRadius: '12px' },
              endAdornment: (
                <IconButton size="small" onClick={addTodo} sx={{ p: 0.5 }}>
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )
            }
          }}
        />
      </Box>

      <List
        disablePadding
        tabIndex={0}
        onKeyDown={handleKeyDown}
        sx={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
          outline: "none",
          "&:focus": { outline: "none" }
        }}
      >
        {activeTodos.map((todo, idx) => {
          const isSelected = activeTodoIdx === idx;
          return (
            <ListItem
              key={todo.id}
              data-todo-id={todo.id}
              disablePadding
              secondaryAction={
                <IconButton edge="end" size="small" onClick={() => deleteTodo(todo.id)}>
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              }
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: '12px',
                mb: 0.5,
                bgcolor: isSelected ? "action.selected" : "transparent",
                "&:hover": {
                  bgcolor: isSelected ? "action.selected" : "action.hover",
                }
              }}
            >
              <ListItemButton 
                onClick={(e) => {
                  setActiveTodoIdx(idx);
                  toggleTodo(todo.id);
                  e.currentTarget.closest("ul")?.focus();
                }} 
                sx={{ py: 1, px: 1.5, borderRadius: '12px' }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <RadioButtonUncheckedIcon sx={{ fontSize: 16 }} />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontSize: 13 }}>{todo.text}</Typography>}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
        {activeTodos.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center", fontStyle: "italic" }}>
            {disabled ? "" : "No tasks yet"}
          </Typography>
        )}
      </List>

      {completedTodos.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", mt: "auto", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
          <Button
            onClick={() => setShowCompleted(!showCompleted)}
            variant="text"
            color="inherit"
            startIcon={
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: 14,
                  transform: showCompleted ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 0.15s"
                }}
              />
            }
            sx={{
              justifyContent: "flex-start",
              textTransform: "none",
              fontSize: 12,
              fontWeight: 700,
              color: "text.secondary",
              py: 0.5,
            }}
          >
            Completed ({completedTodos.length})
          </Button>

          <Collapse in={showCompleted}>
            <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5, pl: 1, mt: 0.5 }}>
              {completedTodos.map((todo) => (
                <ListItem
                  key={todo.id}
                  disablePadding
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => deleteTodo(todo.id)}>
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  }
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: '12px',
                    mb: 0.5,
                    bgcolor: "action.selected",
                    opacity: 0.8,
                  }}
                >
                  <ListItemButton onClick={() => toggleTodo(todo.id)} sx={{ py: 0.8, px: 1.5, borderRadius: '12px' }}>
                    <ListItemIcon sx={{ minWidth: 32, color: "text.secondary" }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontSize: 13, textDecoration: "line-through", color: "text.secondary" }}>
                          {todo.text}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </Box>
      )}
    </Box>
  );
};

