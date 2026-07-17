import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import type { SxProps, Theme } from '@mui/material/styles';
import { useUI } from '../context/UIContext';
import {
  ClipboardText, Plus, PlusCircle, Archive, ArrowCircleDown, ArrowDown, ArrowUp,
  Sparkle, ChartBar, BookmarkSimple, Bug, Check, CheckCircle, CaretRight, X,
  Palette, Copy, Scissors, Trash, FileText, Checks, Download, Upload, Trophy,
  MagnifyingGlass, FolderOpen, TextB, TextItalic, ListBullets, TextUnderline,
  CornersOut, Question, ClockCounterClockwise, Info, CaretDown, Tag, BookOpenText,
  GitMerge, DotsThreeVertical, FilePlus, ArrowSquareOut, User, Play, MusicNote,
  Circle, ArrowCounterClockwise, FloppyDisk, Gear, Stop, TextT, Timer, Faders,
  Sidebar, MagnifyingGlassPlus, MagnifyingGlassMinus, Camera, CheckSquareOffset,
  Garage, Command, DotsThree, DotsSix, Books, Pencil, DiscordLogo,
  SquaresFour, FolderStar, TreeStructure, Rows, ListMagnifyingGlass, GoogleLogo, FolderSimplePlus
} from '@phosphor-icons/react';

type IconProps = SvgIconProps & {
  sx?: SxProps<Theme>;
};

function createPhosphorIcon(PhosphorComponent: React.ElementType): React.FC<IconProps> {
  return (props) => {
    let iconStyle: any = "fill";
    try {
      const ui = useUI();
      iconStyle = ui.iconStyle;
    } catch {
      iconStyle = localStorage.getItem("actone-icon-style") || "fill";
    }
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

export const CommandPaletteIcon: React.FC<IconProps> = (props) => {
  let iconStyle: any = "fill";
  try {
    const ui = useUI();
    iconStyle = ui.iconStyle;
  } catch {
    iconStyle = localStorage.getItem("actone-icon-style") || "fill";
  }

  if (iconStyle === "fill") {
    return (
      <SvgIcon viewBox="0 0 100 100" {...props}>
        <rect x="8" y="16" width="6" height="68" rx="0" />
        <rect x="18" y="16" width="6" height="68" rx="0" />
        <rect x="76" y="16" width="6" height="68" rx="0" />
        <rect x="86" y="16" width="6" height="68" rx="0" />
        <path d="M 33 86 L 48 14 L 67 86 Z M 44 80 L 48 22 L 56 80 Z" fillRule="evenodd" />
        <rect x="30" y="52" width="40" height="6" rx="0" />
      </SvgIcon>
    );
  }

  if (iconStyle === "duotone") {
    return (
      <SvgIcon viewBox="0 0 100 100" {...props}>
        <rect x="8" y="16" width="6" height="68" rx="0" opacity="0.5" />
        <rect x="18" y="16" width="6" height="68" rx="0" opacity="0.5" />
        <rect x="76" y="16" width="6" height="68" rx="0" opacity="0.5" />
        <rect x="86" y="16" width="6" height="68" rx="0" opacity="0.5" />
        <path d="M 33 86 L 48 14 L 67 86 Z M 44 80 L 48 22 L 56 80 Z" fillRule="evenodd" />
        <rect x="30" y="52" width="40" height="6" rx="0" />
      </SvgIcon>
    );
  }

  return (
    <SvgIcon viewBox="0 0 100 100" {...props}>
      <path d="M 12 20 L 8 20 L 8 80 L 12 80" fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="miter" />
      <path d="M 22 20 L 18 20 L 18 80 L 22 80" fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="miter" />
      <path d="M 78 20 L 82 20 L 82 80 L 78 80" fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="miter" />
      <path d="M 88 20 L 92 20 L 92 80 L 88 80" fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="miter" />
      <path d="M 33 86 L 48 14 L 67 86" fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="miter" />
      <line x1="30" y1="54" x2="70" y2="54" stroke="currentColor" strokeWidth={3} />
    </SvgIcon>
  );
};
