import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";

export const KBD: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      px: 0.6, py: 0.15, mx: 0.2,
      fontSize: "11px", fontWeight: 700,
      fontFamily: "monospace",
      bgcolor: "action.selected",
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 0,
      lineHeight: 1.5,
      verticalAlign: "middle",
    }}
  >
    {children}
  </Box>
);

const Mono: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <Typography
    component="code"
    variant="body2"
    sx={{
      fontFamily: "Courier Prime, monospace",
      fontSize: "12px",
      bgcolor: "action.hover",
      px: 0.5,
      borderRadius: 0,
    }}
  >
    {children}
  </Typography>
);

const components = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 1.5 }}>
      {children}
    </Typography>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <Typography component="strong" variant="body2" color="text.primary" sx={{ fontWeight: 700 }}>
      {children}
    </Typography>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <Mono>{children}</Mono>
  ),
  kbd: ({ children }: { children?: React.ReactNode }) => (
    <KBD>{children}</KBD>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <Box component="ul" sx={{ m: 0, mb: 1.5, pl: "20px", lineHeight: 2 }}>
      {children}
    </Box>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <Box component="ol" sx={{ m: 0, mb: 1.5, pl: "20px", lineHeight: 2 }}>
      {children}
    </Box>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <Box component="li" sx={{ "& > p": { mb: 0 } }}>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Box>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, mb: 1, mt: 2 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 14, mb: 1, mt: 1.5 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13, mb: 0.5, mt: 1.5 }}>
      {children}
    </Typography>
  ),
  hr: () => <Box sx={{ my: 2, borderTop: 1, borderColor: "divider" }} />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <Table size="small" sx={{ mb: 1.5, "& .MuiTableCell-root": { py: 0.6, px: 1.5, fontSize: "0.8rem" } }}>
      <TableBody>{children}</TableBody>
    </Table>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <TableRow sx={{ "&:nth-of-type(odd)": { bgcolor: "action.hover" } }}>
      {children}
    </TableRow>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <TableCell sx={{ color: "text.secondary", borderBottom: "none" }}>
      {children}
    </TableCell>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <TableCell sx={{ color: "text.secondary", borderBottom: 1, borderColor: "divider", fontWeight: 700 }}>
      {children}
    </TableCell>
  ),
};

interface HelpMarkdownProps {
  content: string;
}

export const HelpMarkdown: React.FC<HelpMarkdownProps> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={components}
  >
    {content}
  </ReactMarkdown>
);
