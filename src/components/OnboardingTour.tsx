import React, { useState, useEffect, useRef } from "react";
import { useEditor, useUI } from "../context";
import { CrossWindowTourCard } from "./CrossWindowTourCard";
import type { TourStep } from "../types/tour";

interface OnboardingTourProps {
  activeTour: "ui" | "fountain" | "tagging" | "advanced" | "theming" | null;
  onCloseTour: () => void;
}

export const UI_STEPS: TourStep[] = [
  {
    title: "Welcome to ActOne!",
    description: "Let's take a guided tour of the workspace to get you familiar with every part of the interface.",
  },
  {
    targetId: "activity-bar",
    title: "The Activity Bar",
    description: "This vertical strip on the far left is your main navigation hub. Each icon switches to a different side panel. The Quick Settings menu lives at the bottom. Let's walk through every panel.",
  },
  {
    targetId: "activity-tab-outline",
    title: "Outline Panel",
    description: "Shows your screenplay's structure as a tree of scenes. You can drag to reorder scenes, collapse sections, and jump to any part of your script instantly.",
  },
  {
    targetId: "activity-tab-scripts",
    title: "Scripts Panel",
    description: "When working with .actone bundles, this panel lists all the scripts inside the bundle. Use the + icon to add multiple .fountain scripts to your bundle and switch between them seamlessly.",
  },
  {
    targetId: "activity-tab-notepad",
    title: "Notepad Panel",
    description: "A scratchpad for quick notes, character ideas, plot points - anything you want to jot down alongside your screenplay. Notes persist with your file.",
  },
  {
    targetId: "activity-tab-markers",
    title: "Markers / Production Breakdown",
    description: "Tag and categorize your scenes for production planning. Assign props, cast, locations, and generate breakdown reports to keep your shoot organized.",
  },
  {
    targetId: "activity-tab-todo",
    title: "Tasks Panel",
    description: "Keep track of writing goals and to-do items. Mark tasks as complete, set priorities, and manage your revision checklist right alongside your script.",
  },
  {
    targetId: "activity-tab-snapshots",
    title: "Snapshots Panel",
    description: "Save named versions of your screenplay at any point. Browse, restore, or compare snapshots - a safety net for experimental rewrites.",
  },
  {
    targetId: "activity-tab-sprint",
    title: "Sprint Tracker",
    description: "A built-in writing timer. Set a duration and write against the clock. Track your words-per-minute and see how your pace evolves across sessions.",
  },
  {
    targetId: "activity-tab-parking",
    title: "Parking Panel",
    description: "Stash deleted or unused text here instead of losing it forever. Great for alternate dialogue, cut scenes, or lines you want to revisit later.",
  },
  {
    targetId: "activity-tab-parking",
    title: "Close the Panel",
    description: "Click the Parking button again to close the sidebar. Activity Bar buttons toggle their panels — clicking the active button dismisses the pane. Remember this when you want to free up screen space.",
    detect: () => {
      const sidebar = document.getElementById("sidebar-container");
      return !sidebar || sidebar.offsetWidth === 0;
    },
    noAutoClick: true,
  },
  {
    targetId: "quick-settings",
    title: "Quick Settings",
    description: "Click the gear icon at the bottom of the Activity Bar to open the Quick Settings menu. Toggle Typewriter Mode, switch themes, choose Letter/A4 paper size, hide Fountain markup, and open the full Settings window.",
  },
  {
    targetId: "quick-settings",
    title: "Escape to Close",
    description: "Press Escape to close menus and dropdowns like the Quick Settings menu. It's a universal shortcut across ActOne. Note: Escape does not close sidebar panels — those need a button click on the active Activity Bar tab.",
    detect: () => {
      const menuPaper = Array.from(document.querySelectorAll<HTMLElement>(".MuiMenu-paper"))
        .find((el) => el.textContent && el.textContent.includes("Quick Settings"));
      return !menuPaper || menuPaper.offsetWidth === 0;
    },
    noMask: true,
    cardPosition: "center",
  },
  {
    targetId: "header-bar",
    title: "The Header Bar",
    description: "This strip holds your open file tabs - click any tab to switch, middle-click to close. Use the + button to create a new file. On the right, the window controls let you minimize, maximize, and close the app.",
  },
  {
    targetId: "editor-workspace",
    title: "The Editor Workspace",
    description: "Your main writing area. ActOne is a distraction-free environment that formats your screenplay in real time as you type. Fountain markup becomes proper screenplay layout instantly.",
  },
  {
    targetId: "status-bar",
    title: "The Status Bar",
    description: "The very bottom of the window gives you live file information and tools. Let's look at each section.",
  },
  {
    targetId: "status-file-name",
    title: "Status Bar - File & Save Status",
    description: "The left side shows the current file name (or active script name for bundles). A spinning indicator means saving is in progress; a green checkmark confirms it's saved to disk.",
  },
  {
    targetId: "status-scenes",
    title: "Status Bar - Document Statistics",
    description: "Keep an eye on your Scene count, running Word count, and your current Page number out of estimated total pages. All three update live as you type.",
  },
  {
    targetId: "status-xray",
    title: "Status Bar - X-Ray Deep Analysis",
    description: "The bar chart icon opens the X-Ray analysis window. It runs a deep pacing report: character speech balance, scene length distribution, page count breakdown, and more.",
  },
  {
    title: "Where Did the Menu Go?",
    description: "You've seen the panels, the header, the editor, and the status bar. But where's the File menu? How do you open a new screenplay, save, or export without menus? The answer is a single shortcut: Ctrl+K.",
  },
  {
    targetId: "command-palette-btn",
    title: "Meet the Command Palette",
    description: "Click the logo button at the top of the Activity Bar - or press Ctrl+K - to open the Command Palette. Every feature is just a few keystrokes away.",
    taskInstructions: "Click the logo button, or press Ctrl+K.",
    detect: () => !!document.querySelector("[data-tour-palette]"),
  },
  {
    title: "Play Around!",
    description: "The palette filters commands as you type. Try opening a new file, zooming in, toggling Zen Mode, or searching for anything else. Run a few commands to get a feel for it - the palette closes after each one. Press Ctrl+K to bring it back anytime.",
    noMask: true,
    cardPosition: "left",
    nextLabel: "Done Exploring",
  },
  {
    title: "You're a Power User!",
    description: "That's all there is to it. Ctrl+K gives you instant access to every feature in ActOne - no more digging through menus. Use it whenever you need something fast. Happy writing!",
  },
];

export const FOUNTAIN_STEPS: TourStep[] = [
  {
    title: "Basic Fountain Syntax",
    description: "Fountain is a simple markup standard that lets you write screenplays in plain text. ActOne auto-formats it into standard screenplay layout instantly. Let's learn by typing!",
  },
  {
    targetId: "editor-workspace",
    title: "1. Scene Headings (Auto-detected)",
    description: "Scene headings outline locations. They always start with standard prefixes like INT. (Interior) or EXT. (Exterior) followed by location and time.",
    taskInstructions: "Type INT. DINER - DAY on a blank line and press Enter.",
    validate: (text) => {
      const lines = text.split("\n");
      return lines.some((l) => /^(INT|EXT)\..+$/i.test(l.trim()));
    },
  },
  {
    targetId: "editor-workspace",
    title: "2. Forced Scene Headings",
    description: "For scenes that aren't inside or outside (like dream sequences or space), force it by starting the line with a single period (.).",
    taskInstructions: "Type .THE BASEMENT - NIGHT on a blank line and press Enter.",
    validate: (text) => {
      const lines = text.split("\n");
      return lines.some((l) => /^\.[A-Z0-9_].+$/i.test(l.trim()) && !/^\.(INT|EXT)/i.test(l.trim()));
    },
  },
  {
    targetId: "editor-workspace",
    title: "3. Characters & Dialogue",
    description: "To write dialogue, type the character's name in ALL CAPS, press Enter, and then type their line on the next line.",
    taskInstructions: "Type WRITER in all caps, press Enter, and type a line of dialogue.",
    validate: (text) => {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1].trim();
        if (line && line === line.toUpperCase() && /^[A-Z\s]+$/.test(line) && nextLine && !nextLine.startsWith("(")) {
          return true;
        }
      }
      return false;
    },
  },
  {
    targetId: "editor-workspace",
    title: "4. Forced Characters (@)",
    description: "For characters with mixed-case or lowercase names (e.g. McWriter or lowercase characters), start the line with an @ symbol.",
    taskInstructions: "Type @McWriter on a new line, hit Enter, and type a line of dialogue.",
    validate: (text) => {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1].trim();
        if (line.startsWith("@") && line.length > 1 && nextLine) {
          return true;
        }
      }
      return false;
    },
  },
  {
    targetId: "editor-workspace",
    title: "5. Parentheticals",
    description: "Parentheticals provide actor direction and belong in parentheses ( ) on the line immediately below the Character name, followed by their dialogue on the next line.",
    taskInstructions: "Type WRITER (ALL CAPS), hit Enter, type (softly), hit Enter, and type a line of dialogue.",
    validate: (text) => {
      const lines = text.split("\n").map((l) => l.trim());
      for (let i = 0; i < lines.length - 2; i++) {
        const charLine = lines[i];
        const parenLine = lines[i + 1];
        const dialogueLine = lines[i + 2];
        const isCharacter = charLine && charLine === charLine.toUpperCase() && /^[A-Z\s]+$/.test(charLine);
        const isParenthetical = parenLine.startsWith("(") && parenLine.endsWith(")");
        const isDialogue = dialogueLine && !dialogueLine.startsWith("(") && !dialogueLine.startsWith(">");
        if (isCharacter && isParenthetical && isDialogue) {
          return true;
        }
      }
      return false;
    },
  },
  {
    targetId: "editor-workspace",
    title: "6. Transitions (CUT TO: / DISSOLVE TO:)",
    description: "Standard transitions like CUT TO: and DISSOLVE TO: are automatically formatted right-aligned. Just type a transition phrase ending with TO: on its own line.",
    taskInstructions: "Type CUT TO: on a blank line and press Enter.",
    validate: (text) => {
      const lines = text.split("\n");
      return lines.some((l) => /^[A-Z\s]+ TO:$/.test(l.trim()));
    },
  },
  {
    targetId: "editor-workspace",
    title: "7. Forced Transitions (>)",
    description: "To force any line as a right-aligned transition, start it with a > symbol. Useful for non-standard transitions or mixed-case text.",
    taskInstructions: "Type > FADE TO BLACK. on a new line and press Enter.",
    validate: (text) => {
      const lines = text.split("\n");
      return lines.some((l) => l.trim().startsWith(">"));
    },
  },
  {
    targetId: "editor-workspace",
    title: "8. Forced Shots (!!)",
    description: "Camera directions or shots are forced onto their own line by starting the line with double exclamation points (!!).",
    taskInstructions: "Type !! ANGLE ON THE DOOR on a new line and press Enter.",
    validate: (text) => {
      const lines = text.split("\n");
      return lines.some((l) => l.trim().startsWith("!!"));
    },
  },
  {
    targetId: "editor-workspace",
    title: "9. Complete Screenplay Demo",
    description: "Here is how a complete scene looks in Fountain format. Plain text auto-formats into standard screenplay layout instantly!",
  },
];

export const ADVANCED_STEPS: TourStep[] = [
  {
    title: "Advanced Fountain Syntax",
    description: "Let's learn six professional features: Sections, Subsections, Synopses, Scene Colours, Storyline Tags, and Markers. You'll type each one in a sandbox, then explore a full demo.",
  },
  {
    title: "Sandbox Ready",
    description: "The editor is ready with a blank file. You'll type each syntax element one at a time.",
  },
  {
    targetId: "editor-workspace",
    title: "Sections",
    description: "Sections divide your screenplay into major parts. Start a line with # followed by a space to create a section heading (e.g., # ACT ONE). Sections appear as bold headers in the Outline panel.",
    taskInstructions: "Type # ACT ONE on a blank line and press Enter.",
    validate: (text) => /^#[^#]/m.test(text),
  },
  {
    targetId: "editor-workspace",
    title: "Subsections",
    description: "Subsections break sections into smaller parts. Start a line with ## followed by a space (e.g., ## The Beginning). Subsections nest under sections in the Outline panel.",
    taskInstructions: "Type ## The Beginning on a new line and press Enter.",
    validate: (text) => /^##/m.test(text),
  },
  {
    targetId: "editor-workspace",
    title: "Synopses",
    description: "A synopsis is a one-line summary that goes right before a scene heading. Start the line with = and write a brief note (e.g., = The hero wakes to a new day). Synopses appear in italics in the Outline panel.",
    taskInstructions: "Type = A hero wakes to a new day. on a new line and press Enter.",
    validate: (text) => /^=.+/m.test(text),
  },
  {
    targetId: "editor-workspace",
    title: "Scene Colours",
    description: "Add a colour to any scene heading by appending [[color]] (e.g., [[blue]], [[red]], [[green]]). The scene block gets a coloured left-edge bar in the editor. Supported: blue, brown, cyan, green, magenta, orange, pink, purple, red, yellow.",
    taskInstructions: "Type INT. HOUSE - DAY [[blue]] on a new line and press Enter.",
    validate: (text) => {
      const headingPattern = /^(?:INT|EXT|INT\.?\/EXT\.?)\..*\[\[(blue|brown|cyan|green|magenta|orange|pink|purple|red|yellow)\]\]/im;
      return headingPattern.test(text);
    },
  },
  {
    targetId: "editor-workspace",
    title: "Storyline Tags",
    description: "Group scenes into storylines by adding [[storyline Label]] on the heading line. Use commas for multiple labels (e.g., [[storyline Main Plot, Romance]]). Labels are case-insensitive. Storyline pills appear beside each scene in the Outline panel.",
    taskInstructions: "Add [[storyline Main Plot]] to your scene heading (e.g., INT. HOUSE - DAY [[blue]] [[storyline Main Plot]]).",
    validate: (text) => {
      const headingLines = text.split('\n').filter(l => /^(?:INT|EXT)\./i.test(l.trim()));
      return headingLines.some(l => /\[\[storyline\s*[^\]]+\]\]/i.test(l));
    },
  },
  {
    targetId: "editor-workspace",
    title: "Markers",
    description: "Markers are personal bookmarks or notes for writers — a way to flag lines you want to revisit later. Use [[marker color: description]] anywhere in your script. Unlike tags, markers are NOT for production breakdown and are always stripped from final exports.",
    taskInstructions: "On a new line, type [[marker orange: Add sound effects]] and press Enter.",
    validate: (text) => /\[\[marker/i.test(text),
  },
  {
    title: "Load Full Demo",
    description: "Now let's load a 6-scene demo screenplay that uses every feature you just learned. Watch as the editor fills with two acts of production-ready Fountain.",
  },
  {
    title: "Observe the Demo",
    description: "Scroll through the demo. Look at how sections (#), subsections (##), synopses (=), scene colours, storyline tags, and markers all work together in a real screenplay. Take your time.",
    noMask: true,
    cardPosition: "left",
  },
  {
    targetId: "activity-tab-outline",
    title: "Open Scene Navigator",
    description: "The Outline panel reveals the full structure of your screenplay.",
    taskInstructions: "Click the Outline tab in the Activity Bar (the list icon).",
    noAutoClick: true,
    detect: () => {
      const sidebar = document.getElementById("sidebar-container");
      if (!sidebar || sidebar.offsetWidth === 0) return false;
      return !!sidebar.querySelector('[data-scene-id]');
    },
  },
  {
    targetId: "sidebar-container",
    title: "Explore the Navigator",
    description: "Look at how sections (#) and subsections (##) are nested with proper indentation. Synopses (=) appear in italics beneath each scene. Coloured left-edge bars match each scene's [[color]] tag. Storyline pills appear as uppercase badges beside each heading. Click around and explore.",
    cardPosition: "left",
  },
  {
    targetId: "activity-tab-markers",
    title: "Open Markers Pane",
    description: "The Markers panel lists every [[marker]] you've seen, grouped by the scene they belong to.",
    taskInstructions: "Click the Markers tab in the Activity Bar (the checkmark icon).",
    noAutoClick: true,
    detect: () => {
      const sidebar = document.getElementById("sidebar-container");
      if (!sidebar || sidebar.offsetWidth === 0) return false;
      return !!sidebar.querySelector('[data-marker-id]');
    },
  },
  {
    targetId: "sidebar-container",
    title: "Explore the Markers Pane",
    description: "Each marker shows its colour dot, your note text, scene number badge, and storyline chips. Notice how markers are grouped under their parent scene. All of these will be stripped from the final export — they're just for you.",
    cardPosition: "left",
  },
  {
    targetId: "editor-workspace",
    title: "Export Options",
    description: "When exporting to PDF, scene colours, sections, subsections, and synopses can be included or excluded via the Export dialog options. This gives you full control over what appears in the final screenplay. Markers ([[marker ...]]) are always stripped — they're for your eyes only.",
  },
  {
    title: "Advanced Syntax Complete!",
    description: "You've mastered Sections, Subsections, Synopses, Scene Colours, Storyline Tags, and Markers. Use the Outline panel to navigate your structure, the Markers pane for personal notes, and the Export dialog to control what goes into the final PDF. Happy writing!",
  },
];

export const THEMING_STEPS: TourStep[] = [
  {
    title: "Welcome to Themes",
    description: "The Theme Manager lets you switch between built-in themes, create your own, and export/import .actheme files. Let's walk through each feature.",
    noMask: true,
    cardPosition: "center",
    cardWidth: 260,
    window: "theme-manager",
  },
  {
    title: "Pick a Theme",
    description: "Browse the theme list on the left. Each theme changes the app's entire color scheme. Try clicking a different theme to see the preview update in real time.",
    taskInstructions: "Click any theme from the list on the left to select it.",
    noMask: true,
    cardPosition: "right",
    cardWidth: 260,
    window: "theme-manager",
  },
  {
    title: "Create Custom Theme",
    description: "Scroll down the theme list on the left. Near the bottom, in the CUSTOM THEMES section, click the Create button to build your own theme. You'll see color pickers for each UI element — pick any colors you like.",
    taskInstructions: "Scroll down and click the Create button to open the custom theme form.",
    noMask: true,
    cardPosition: "right",
    cardWidth: 260,
    window: "theme-manager",
  },
  {
    title: "Export & Import",
    description: "After saving a custom theme, use the Export button (download icon) next to it to save as a .actheme file — share themes or back them up. Use the Import button at the top of the Custom Themes section to load a .actheme file from disk. .actheme files are plain JSON and can be edited in any text editor.",
    noMask: true,
    cardPosition: "center",
    cardWidth: 260,
    window: "theme-manager",
  },
  {
    title: "Themes Complete!",
    description: "You've learned how to pick themes, create custom ones, and work with .actheme files. Happy theming!",
    noMask: true,
    cardPosition: "center",
    cardWidth: 260,
    window: "theme-manager",
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  activeTour,
  onCloseTour,
}) => {
  const { editorView } = useEditor();
  const { hideTagsEnabled } = useUI();
  const [activeStep, setActiveStepState] = useState(0);
  const [taskComplete, setTaskComplete] = useState(false);
  const sandboxCreated = useRef(false);

  const steps = activeTour === "fountain" 
    ? FOUNTAIN_STEPS 
    : (activeTour === "tagging" ? TAGGING_STEPS : (activeTour === "advanced" ? ADVANCED_STEPS : (activeTour === "theming" ? THEMING_STEPS : UI_STEPS)));
  const currentStep = steps[activeStep];
  const tourName = activeTour === "fountain" 
    ? "Fountain Syntax" 
    : (activeTour === "tagging" ? "Tagging Tour" : (activeTour === "advanced" ? "Advanced Syntax" : (activeTour === "theming" ? "Themes" : "App Tour")));

  const setActiveStep = (step: number | ((prev: number) => number)) => {
    setActiveStepState(step);
  };

  useEffect(() => {
    setActiveStepState(0);
    localStorage.removeItem("actone-tour-step");
    setTaskComplete(false);
    sandboxCreated.current = false;
  }, [activeTour]);

  const handleClose = () => {
    onCloseTour();
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStepState((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStepState((prev) => prev - 1);
    }
  };

  const progress = ((activeStep + 1) / steps.length) * 100;

  // Handle focus, newline injection, and demo screenplay injection
  useEffect(() => {
    if (activeTour !== "fountain" || !editorView) return;

    editorView.focus();
    const docLength = editorView.state.doc.length;
    editorView.dispatch({
      selection: { anchor: docLength, head: docLength }
    });

    if (activeStep > 1 && activeStep < steps.length - 1) {
      editorView.dispatch({
        changes: { from: docLength, to: docLength, insert: "\n\n" },
        selection: { anchor: docLength + 2, head: docLength + 2 }
      });
      editorView.focus();
    }

    if (activeStep === steps.length - 1) {
      const demoScene = `INT. COFFEE SHOP - DAY\n\nA young WRITER sits at a corner table, staring at a blank screen.\n\nWRITER\n(sighs)\nWhy is writing so hard?\n\nSuddenly, a beautiful idea sparks in their mind. They type furiously.\n\n!! CLOSE ON THE SCREEN\n\nWe see the words forming. It's magic.\n\n> FADE OUT.`;
      editorView.dispatch({
        changes: { from: 0, to: docLength, insert: demoScene },
        selection: { anchor: 0, head: 0 }
      });
      editorView.scrollDOM.scrollTop = 0;
      editorView.focus();
    }
  }, [activeStep, activeTour, editorView, steps.length]);

  // Handle advanced tour injection: sandbox at step 1, demo at step 8
  useEffect(() => {
    if (activeTour !== "advanced" || !editorView) return;

    if (activeStep === 1) {
      const docLength = editorView.state.doc.length;
      editorView.dispatch({
        changes: { from: 0, to: docLength, insert: "=== ADVANCED SANDBOX ===\n\n" },
        selection: { anchor: docLength, head: docLength },
      });
      editorView.focus();
    }

    if (activeStep === 8) {
      const demoScenes = `# ACT ONE

## The Discovery

INT. ABANDONED WAREHOUSE - NIGHT [[blue]] [[storyline Main Plot]]

= Morales discovers a break-in at the warehouse.

The cavernous space is lit only by emergency lights casting long shadows. Crates are stacked to the ceiling.

[[marker red: Add sound design notes]]

DETECTIVE MORALES
(kneeling by a crate)
There's been a break-in. Look at this lock.

MORALES picks up a broken padlock, examines it under a flashlight.

CUT TO:

## The Interrogation

INT. POLICE STATION - DAY [[red]] [[storyline Main Plot, Sub Plot B]]

= Reyes pressures Morales for answers.

Morales sits across from CAPTAIN REYES.

CAPTAIN REYES
The commissioner wants answers by midnight.

[[marker yellow]]

MORALES
Then we'd better get to work.

## A New Lead

EXT. ROOFTOP - DAWN [[green]] [[storyline Sub Plot B]]

= A mysterious figure watches the sunrise.

A lone figure stands at the edge.

[[marker orange: Check lighting]]

JANE
(whispering)
Too late. We missed it.

# ACT TWO

## The Chase

EXT. ALLEYWAY - NIGHT [[purple]] [[storyline Main Plot]]

= Morales chases a suspect.

Rain pours down. Trash cans clatter.

MORALES
(V.O.)
This is where it ends.

[[marker pink: Add stunt notes]]

## The Final Confrontation

INT. WAREHOUSE - DAY [[orange]] [[storyline Climax]]

= The final confrontation between Morales and the suspect.

MORALES
It's over.

SUSPECT
You're too late.

[[marker cyan: Record ADR line]]

CUT TO:

## The Resolution

EXT. STREET - SUNSET [[cyan]] [[storyline Main Plot, Climax]]

= Morales walks away as the case closes.

Morales puts on his sunglasses.

MORALES
Another day, another case.

[[marker green: Add credits music cue]]`;

      const docLength = editorView.state.doc.length;
      editorView.dispatch({
        changes: { from: 0, to: docLength, insert: demoScenes },
        selection: { anchor: 0, head: 0 },
      });
      editorView.scrollDOM.scrollTop = 0;
      editorView.focus();
    }
  }, [activeTour, activeStep, editorView]);

  // Auto-click Activity Bar tabs, Quick Settings, and Command Palette when entering a step
  useEffect(() => {
    if (!currentStep?.targetId || currentStep.noAutoClick) return;

    if (activeTour !== "ui" && activeTour !== "tagging" && activeTour !== "advanced") return;

    const targetId = currentStep.targetId;

    if (targetId.startsWith("activity-tab-")) {
      const el = document.getElementById(targetId);
      if (el) {
        el.click();
        requestAnimationFrame(() => {
          const sidebar = document.getElementById("sidebar-container");
          if (!sidebar || sidebar.offsetWidth === 0) {
            el.click();
          }
        });
      }
    } else if (targetId === "quick-settings") {
      const el = document.getElementById(targetId);
      if (el) el.click();
    } else if (targetId === "command-palette-btn") {
      // Don't auto-click or auto-open Command Palette; let the user do it manually
    }
  }, [activeStep, activeTour, currentStep]);

  // Live validator for interactive typing and state configurations
  useEffect(() => {
    if (activeTour === "tagging") {
      if (activeStep === 3) {
        setTaskComplete(hideTagsEnabled === true);
        return;
      }
      if (activeStep === 5) {
        setTaskComplete(hideTagsEnabled === false);
        return;
      }
    }

    if (activeTour === "advanced" && currentStep?.validate) {
      setTaskComplete(false);
      const interval = setInterval(() => {
        if (editorView) {
          const text = editorView.state.doc.toString();
          if (currentStep.validate!(text)) {
            setTaskComplete(true);
          }
        }
      }, 200);
      return () => clearInterval(interval);
    }

    if (activeTour !== "fountain" || !currentStep?.validate) {
      if (!currentStep?.detect) {
        setTaskComplete(true);
      }
      return;
    }

    setTaskComplete(false);
    const interval = setInterval(() => {
      if (editorView) {
        const text = editorView.state.doc.toString();
        if (currentStep.validate!(text)) {
          setTaskComplete(true);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [activeTour, activeStep, currentStep, editorView, hideTagsEnabled]);

  // DOM detection polling (e.g., Command Palette tour)
  useEffect(() => {
    if (!currentStep?.detect) return;

    setTaskComplete(false);
    const interval = setInterval(() => {
      if (currentStep.detect!()) {
        setTaskComplete(true);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [activeStep, currentStep, steps.length]);

  // Shift+Enter to advance the tour
  useEffect(() => {
    if (!activeTour) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.shiftKey && taskComplete) {
        e.preventDefault();
        e.stopPropagation();
        if (activeStep < steps.length - 1) {
          setActiveStep((prev) => prev + 1);
        } else {
          onCloseTour();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [activeTour, taskComplete, activeStep, steps.length, onCloseTour]);

  if (!activeTour) return null;

  const currentWindow = new URLSearchParams(window.location.search).get("modal") || "main";
  const stepWindow = currentStep.window || "main";

  if (stepWindow !== currentWindow) {
    return null;
  }



  return (
    <CrossWindowTourCard
      step={currentStep}
      tourName={tourName}
      progress={progress}
      taskComplete={taskComplete}
      isLastStep={activeStep >= steps.length - 1}
      stepNumber={activeStep + 1}
      totalSteps={steps.length}
      onNext={handleNext}
      onBack={activeStep > 0 ? handleBack : undefined}
      onCancel={handleClose}
    />
  );
};

export const TAGGING_STEPS: TourStep[] = [
  {
    title: "Introduction to Tagging",
    description: "Production tags help you categorize items in your screenplay (like Props, Sounds, Animals, or Costumes) for shooting. In this tour, we'll practice creating tags and managing their visibility in the editor.",
  },
  {
    targetId: "editor-workspace",
    title: "1. Create 5+ Tags",
    description: "Highlight any word in your screenplay, hold Ctrl and right-click to open the Quick Tag menu, then pick a category.\n\nSuggested tags to create:\n- Prop: desk, phone, or mirror\n- Sound: buzzing, ring, or crash\n- Animal: Bee, butterfly, or creature\n- Set Design: Hive, Chamber, or Office\n\nTag at least 5 words to proceed.",
    taskInstructions: "Select a word, hold Ctrl + right-click, choose a category. Repeat for at least 5 tags.",
    detect: () => {
      const editor = document.querySelector(".cm-editor");
      if (!editor) return false;
      return editor.querySelectorAll('[class*="cm-tag-"]').length >= 5;
    },
  },
  {
    targetId: "editor-workspace",
    title: "2. Auto-Populated Cast Tags",
    description: "You don't have to manually tag the speaking cast; they are automatically populated in the Tag Manager. Only use manual tagging for non-speaking casts if they are important for production breakdown.",
  },
  {
    targetId: "command-palette-btn",
    title: "3. Hide the Tags",
    description: "Sometimes you want a clean reading experience without colored tag highlights. Open the Command Palette (click the logo button or press Ctrl+K), type 'Hide tags', and select the toggle command.",
    taskInstructions: "Open Command Palette (Ctrl+K) -> Toggle 'Hide tags'.",
  },
  {
    targetId: "editor-workspace",
    title: "Verify Tags Hidden",
    description: "Take a moment to look at the editor. Notice that all of the colored highlights for your tags and cast members have disappeared, providing a clean canvas.",
  },
  {
    targetId: "command-palette-btn",
    title: "4. Show the Tags",
    description: "Great! The highlights are now hidden. Now open the Command Palette again (Ctrl+K), type 'Show tags', and select the command to restore the colored highlights in the editor.",
    taskInstructions: "Open Command Palette (Ctrl+K) -> Toggle 'Show tags'.",
  },
  {
    targetId: "editor-workspace",
    title: "Verify Tags Visible",
    description: "Observe the editor again. The tag highlights and cast indicators are back! This toggle makes it easy to switch between formatting and writing.",
  },
  {
    title: "Tagging Tour Completed!",
    description: "Excellent job! You've learned how to create production tags, verify auto-cast tags, and toggle tag visibility. When you want to see the full breakdown and export CSVs, you can open the Tag Manager from the Command Palette (Ctrl+K → 'Open Tag Manager').",
  },
];


