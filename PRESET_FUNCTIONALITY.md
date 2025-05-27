# Preset Functionality Documentation

## Overview

The preset functionality allows users to load pre-configured agent workflows without automatically executing them. Users can review, modify, and then manually run these preset chains.

## How It Works

### 1. Preset Selection

- User sees 9 presets organized in 3 themed columns:
  - **Research/Analysis**: Market Research, Data Analysis, Academic Research
  - **Coding**: Feature Development, Bug Analysis & Fix, App Architecture
  - **Creative/Writing**: Story Writing, Content Strategy, Script Writing

### 2. Preset Loading Process

1. **User clicks preset** → `WelcomeScreen.handlePresetClick()`
2. **Agents loaded** → `ChatPage.handleLoadPreset()` stores preset agents (NO session created)
3. **UI updates** → InputArea loads preset agents into editable form
4. **User can edit** → User modifies prompts, models, connections as needed
5. **User runs chain** → Session is created only when "Run Chain" is pressed

### 3. User Control

- **View**: User can see all preset agents with their:
  - Model selections (GPT-4o, Claude, etc.)
  - Prompts (fully editable)
  - Connection types (direct, conditional, etc.)
- **Edit**: User can modify any aspect before running:
  - Change prompts
  - Swap models
  - Adjust connection logic
- **Run**: Only when user clicks "Run Chain" does execution begin

## Key Features

### ✅ No Auto-Execution

- Clicking a preset only loads the configuration
- User maintains full control over when to execute
- Chain runs only when "Run Chain" button is pressed

### ✅ Full Editability

- All preset fields are editable after loading
- Users can customize workflows to their needs
- Models, prompts, and connections can all be changed

### ✅ Proper State Management

- Preset agents are loaded into InputArea state
- Clean separation between preset loading and execution
- State is properly cleared after loading to prevent re-loading

## Code Flow

```
WelcomeScreen
  ↓ (preset click)
ChatPage.handleLoadPreset()
  ↓ (stores presetAgents state - NO session created)
InputArea.useEffect()
  ↓ (detects presetAgents change)
setAgents(presetAgents)
  ↓ (user can edit agents)
User clicks "Run Chain"
  ↓
ChatPage.handleSendChain()
  ↓ (NOW creates session + runs chain)
Chain execution begins
```

## Implementation Details

### Files Modified

- `components/welcome-screen.tsx`: Preset UI and click handling
- `app/chat/page.tsx`: Session creation and preset state management
- `components/input-area.tsx`: Preset loading into editable form
- Added proper TypeScript interfaces for preset data flow

### No Breaking Changes

- All existing functionality preserved
- Preset loading is additive feature
- Original manual chain building still works exactly the same

This implementation perfectly meets the requirement: **"clicking the preset button should just set up the chain to be exactly what it should be for that preset and still leave the user the ability and option to adjust/tweak prompts or the chosen model before pressing run chain"**
