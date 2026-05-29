import React, { useEffect, useState } from "react";
import { 
  FilePlus, 
  FolderOpen, 
  Clock, 
  FileText, 
  X, 
  ChevronRight,
  BookOpen,
  Zap,
  Layout
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { invoke } from "@tauri-apps/api/core";
import "./WelcomeModal.css";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { 
    newFile, 
    openFile, 
    recentFiles, 
    openFilePath 
  } = useAppContext();
  
  const [structures, setStructures] = useState<any[]>([]);
  const [, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStructures = async () => {
      try {
        const res = await invoke<any[]>("get_structures");
        setStructures(res);
      } catch (e) {
        console.error("Failed to fetch structures:", e);
      }
    };
    if (isOpen) {
      fetchStructures();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNew = () => {
    newFile();
    onClose();
  };

  const handleOpen = async () => {
    await openFile();
    onClose();
  };

  const handleRecent = async (path: string) => {
    setIsLoading(true);
    await openFilePath(path);
    setIsLoading(false);
    onClose();
  };

  const handleTemplate = async (name: string) => {
    setIsLoading(true);
    try {
      const content = await invoke<string>("get_structure_template", { name });
      newFile(content);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="welcome-overlay" onClick={onClose}>
      <div className="welcome-modal" onClick={e => e.stopPropagation()}>
        <button className="welcome-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="welcome-sidebar">
          <div className="welcome-logo">
            <div className="logo-icon">A</div>
            <div className="logo-text">
              <h1>ActOne</h1>
              <span>Version 0.1.0</span>
            </div>
          </div>

          <div className="welcome-actions">
            <button className="action-card primary" onClick={handleNew}>
              <div className="action-icon"><FilePlus size={24} /></div>
              <div className="action-info">
                <h3>New Screenplay</h3>
                <p>Start a blank project from scratch</p>
              </div>
              <ChevronRight size={18} className="action-arrow" />
            </button>

            <button className="action-card" onClick={handleOpen}>
              <div className="action-icon"><FolderOpen size={24} /></div>
              <div className="action-info">
                <h3>Open Existing...</h3>
                <p>Browse your computer for a file</p>
              </div>
              <ChevronRight size={18} className="action-arrow" />
            </button>
          </div>

          <div className="welcome-footer">
            <div className="footer-links">
              <a href="#" onClick={e => e.preventDefault()}><BookOpen size={14} /> Documentation</a>
              <a href="#" onClick={e => e.preventDefault()}><Zap size={14} /> What's New?</a>
            </div>
          </div>
        </div>

        <div className="welcome-content">
          <section className="welcome-section">
            <div className="section-header">
              <Clock size={18} />
              <h2>Recent Files</h2>
            </div>
            <div className="recent-list">
              {recentFiles.length > 0 ? (
                recentFiles.map((file, i) => (
                  <div key={i} className="recent-item" onClick={() => handleRecent(file.path)}>
                    <FileText size={20} className="item-icon" />
                    <div className="item-info">
                      <span className="item-name">{file.name}</span>
                      <span className="item-path">{file.path}</span>
                    </div>
                    <span className="item-date">
                      {new Date(file.lastOpened).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No recent files found</p>
                </div>
              )}
            </div>
          </section>

          <section className="welcome-section">
            <div className="section-header">
              <Layout size={18} />
              <h2>Start from Structure</h2>
            </div>
            <div className="templates-grid">
              {structures.map((s, i) => (
                <div key={i} className="template-item" onClick={() => handleTemplate(s.name)}>
                  <div className="template-icon">
                    <Zap size={16} />
                  </div>
                  <div className="template-info">
                    <h4>{s.name}</h4>
                    <p>{s.description || "Story structure template"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
