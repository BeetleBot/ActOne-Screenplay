import React, { useSyncExternalStore } from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import type { SxProps, Theme } from '@mui/material/styles';
import {
  ClipboardText, Plus, PlusCircle, Archive, ArrowCircleDown, ArrowDown, ArrowUp,
  Sparkle, ChartBar, BookmarkSimple, Bug, Check, CheckCircle, CaretRight, X,
  Palette, Copy, Scissors, Trash, FileText, Checks, Download, Upload, Trophy,
  MagnifyingGlass, FolderOpen, TextB, TextItalic, ListBullets, TextUnderline,
  CornersOut, Question, ClockCounterClockwise, Info, CaretDown, Tag, BookOpenText,
  GitMerge, DotsThreeVertical, FilePlus, ArrowSquareOut, User, Play, MusicNote,
  Circle, ArrowCounterClockwise, FloppyDisk, Gear, Stop, TextT, Timer, Faders,
  Sidebar, MagnifyingGlassPlus, MagnifyingGlassMinus, Camera, CheckSquareOffset,
  Garage, Command, DotsThree, DotsSix, Books, Pencil, DiscordLogo, KeyReturn,
  SquaresFour, FolderStar, TreeStructure, Rows, ListMagnifyingGlass, GoogleLogo, FolderSimplePlus,
  Minus, ChatDots, PaperPlaneRight
} from '@phosphor-icons/react';
import { STORAGE_KEYS } from "../constants";

type IconProps = SvgIconProps & {
  sx?: SxProps<Theme>;
};

function iconStyleSubscribe(cb: () => void) {
  window.addEventListener("settings-changed", cb);
  return () => window.removeEventListener("settings-changed", cb);
}

function getIconStyleSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEYS.ICON_STYLE) || "fill";
  } catch {
    return "fill";
  }
}

function createPhosphorIcon(PhosphorComponent: React.ElementType): React.FC<IconProps> {
  return (props) => {
    const iconStyle = useSyncExternalStore(iconStyleSubscribe, getIconStyleSnapshot);
    return (
      <SvgIcon component={PhosphorComponent} weight={iconStyle} inheritViewBox {...props} />
    );
  };
}

export const AssignmentIcon = createPhosphorIcon(ClipboardText);
export const AddIcon = createPhosphorIcon(Plus);
export const AddCircleIcon = createPhosphorIcon(PlusCircle);
export const ArchiveIcon = createPhosphorIcon(Archive);
export const ArrowCircleDownIcon = createPhosphorIcon(ArrowCircleDown);
export const ArrowDownwardIcon = createPhosphorIcon(ArrowDown);
export const ArrowUpwardIcon = createPhosphorIcon(ArrowUp);
export const AutoAwesomeIcon = createPhosphorIcon(Sparkle);
export const BarChartIcon = createPhosphorIcon(ChartBar);
export const BookmarkIcon = createPhosphorIcon(BookmarkSimple);
export const BugReportIcon = createPhosphorIcon(Bug);
export const CheckIcon = createPhosphorIcon(Check);
export const CheckCircleIcon = createPhosphorIcon(CheckCircle);
export const ChevronRightIcon = createPhosphorIcon(CaretRight);
export const CloseIcon = createPhosphorIcon(X);
export const ClearIcon = CloseIcon;
export const ColorLensIcon = createPhosphorIcon(Palette);
export const ContentCopyIcon = createPhosphorIcon(Copy);
export const ContentCutIcon = createPhosphorIcon(Scissors);
export const DeleteIcon = createPhosphorIcon(Trash);
export const DescriptionIcon = createPhosphorIcon(FileText);
export const DoneAllIcon = createPhosphorIcon(Checks);
export const DownloadIcon = createPhosphorIcon(Download);
export const UploadIcon = createPhosphorIcon(Upload);
export const EmojiEventsIcon = createPhosphorIcon(Trophy);
export const FileDownloadIcon = DownloadIcon;
export const FindReplaceIcon = createPhosphorIcon(MagnifyingGlass);
export const FolderOpenIcon = createPhosphorIcon(FolderOpen);
export const FormatBoldIcon = createPhosphorIcon(TextB);
export const FormatItalicIcon = createPhosphorIcon(TextItalic);
export const FormatListBulletedIcon = createPhosphorIcon(ListBullets);
export const FormatUnderlinedIcon = createPhosphorIcon(TextUnderline);
export const FullscreenIcon = createPhosphorIcon(CornersOut);
export const HelpOutlinedIcon = createPhosphorIcon(Question);
export const HistoryIcon = createPhosphorIcon(ClockCounterClockwise);
export const InfoOutlinedIcon = createPhosphorIcon(Info);
export const KeyboardArrowDownIcon = createPhosphorIcon(CaretDown);
export const LocalOfferIcon = createPhosphorIcon(Tag);
export const MenuBookIcon = createPhosphorIcon(BookOpenText);
export const MergeTypeIcon = createPhosphorIcon(GitMerge);
export const MoreVertIcon = createPhosphorIcon(DotsThreeVertical);
export const NoteAddIcon = createPhosphorIcon(FilePlus);
export const OpenInNewIcon = createPhosphorIcon(ArrowSquareOut);
export const PersonIcon = createPhosphorIcon(User);
export const PlayArrowIcon = createPhosphorIcon(Play);
export const MusicNoteIcon = createPhosphorIcon(MusicNote);
export const RadioButtonUncheckedIcon = createPhosphorIcon(Circle);
export const RestartAltIcon = createPhosphorIcon(ArrowCounterClockwise);
export const SaveIcon = createPhosphorIcon(FloppyDisk);
export const SearchIcon = createPhosphorIcon(MagnifyingGlass);
export const SettingsIcon = createPhosphorIcon(Gear);
export const StopIcon = createPhosphorIcon(Stop);
export const TaskAltIcon = createPhosphorIcon(CheckCircle);
export const TextFieldsIcon = createPhosphorIcon(TextT);
export const TimerIcon = createPhosphorIcon(Timer);
export const TuneIcon = createPhosphorIcon(Faders);
export const ViewSidebarIcon = createPhosphorIcon(Sidebar);
export const ZoomInIcon = createPhosphorIcon(MagnifyingGlassPlus);
export const ZoomOutIcon = createPhosphorIcon(MagnifyingGlassMinus);
export const CameraIcon = createPhosphorIcon(Camera);
export const AssignmentAddIcon = createPhosphorIcon(ClipboardText);
export const AddNotesIcon = createPhosphorIcon(FilePlus);
export const BeenhereIcon = createPhosphorIcon(CheckSquareOffset);
export const GarageIcon = createPhosphorIcon(Garage);
export const ViewAgendaIcon = createPhosphorIcon(Rows);
export const ActionKeyIcon = createPhosphorIcon(Command);
export const KeyboardShortcutsIcon = createPhosphorIcon(KeyReturn);
export const MoreHorizIcon = createPhosphorIcon(DotsThree);
export const DragHandleIcon = createPhosphorIcon(DotsSix);
export const LibraryBooksIcon = createPhosphorIcon(Books);
export const EditIcon = createPhosphorIcon(Pencil);
export const DiscordIcon = createPhosphorIcon(DiscordLogo);
export const Dashboard2AddIcon = createPhosphorIcon(SquaresFour);
export const CombineColumnsIcon = createPhosphorIcon(TreeStructure);
export const FolderSpecialIcon = createPhosphorIcon(FolderStar);
export const ListMagnifyingGlassIcon = createPhosphorIcon(ListMagnifyingGlass);
export const GoogleLogoIcon = createPhosphorIcon(GoogleLogo);
export const FolderSimplePlusIcon = createPhosphorIcon(FolderSimplePlus);
export const MinimizeIcon = createPhosphorIcon(Minus);
export const ChatDotsIcon = createPhosphorIcon(ChatDots);
export const SendIcon = createPhosphorIcon(PaperPlaneRight);

export const RobotIcon: React.FC<IconProps> = (props) => {
  return (
    <SvgIcon viewBox="0 0 256 256" {...props}>
      <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32.03635,32.03635,0,0,0,24,80V192a32.03635,32.03635,0,0,0,32,32H200a32.03635,32.03635,0,0,0,32-32V80A32.03635,32.03635,0,0,0,200,48ZM72,108a12,12,0,1,1,12,12A12,12,0,0,1,72,108Zm28,76H92a16,16,0,0,1,0-32h8Zm40,0H116V152h24Zm24,0h-8V152h8a16,16,0,0,1,0,32Zm8-64a12,12,0,1,1,12-12A12,12,0,0,1,172,120Z" />
    </SvgIcon>
  );
};

/* ── Faceted Geometric Star Icon for Muse ── */
export const MuseIcon: React.FC<IconProps> = (props) => {
  return (
    <SvgIcon viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="miter"
      />
    </SvgIcon>
  );
};

