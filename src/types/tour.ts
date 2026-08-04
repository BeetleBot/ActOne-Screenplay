export type TourWindow =
  | "main"
  | "settings"
  | "theme-manager"
  | "xray"
  | "export"
  | "structure"
  | "title-page";

export interface TourStep {
  targetId?: string;
  title: string;
  description: string;
  taskInstructions?: string;
  window?: TourWindow;
  validate?: (text: string) => boolean;
  detect?: () => boolean;
  triggerOpen?: () => void;
  noMask?: boolean;
  cardPosition?: "left" | "right" | "center";
  cardWidth?: number;
  nextLabel?: string;
  autoAdvance?: boolean;
  noAutoClick?: boolean;
}
