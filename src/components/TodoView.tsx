import React, { useState, useCallback } from "react";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { useAppContext } from "../context/AppContext";
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
  Alert,
  AlertTitle,
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

const ActoneBanner: React.FC<{ saveFileAs?: () => Promise<string | null> }> = ({ saveFileAs }) => (
  <Alert
    severity="warning"
    sx={{ mb: 2, borderRadius: 0 }}
    action={
      saveFileAs && (
        <Button
          color="warning"
          size="small"
          variant="contained"
          onClick={() => saveFileAs()}
          sx={{ fontWeight: 600, textTransform: "none" }}
        >
          Save as .actone
        </Button>
      )
    }
  >
    <AlertTitle sx={{ fontWeight: 700 }}>Only available on .actone</AlertTitle>
    Tasks require saving the screenplay as an ActOne Bundle (.actone).
  </Alert>
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2, gap: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8 }}>
        Tasks
      </Typography>

      {disabled && <ActoneBanner saveFileAs={saveFileAs} />}

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
        sx={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto"
        }}
      >
        {activeTodos.map(todo => (
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
              borderRadius: 0,
              mb: 0.5,
              "&:hover": {
                bgcolor: "action.hover",
              }
            }}
          >
            <ListItemButton onClick={() => toggleTodo(todo.id)} sx={{ py: 1, px: 1.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <RadioButtonUncheckedIcon sx={{ fontSize: 16 }} />
              </ListItemIcon>
              <ListItemText
                primary={<Typography variant="body2" sx={{ fontSize: 13 }}>{todo.text}</Typography>}
              />
            </ListItemButton>
          </ListItem>
        ))}
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
                    borderRadius: 0,
                    mb: 0.5,
                    bgcolor: "action.selected",
                    opacity: 0.8,
                  }}
                >
                  <ListItemButton onClick={() => toggleTodo(todo.id)} sx={{ py: 0.8, px: 1.5 }}>
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

