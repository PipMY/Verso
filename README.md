# Verso - Cross-Platform Reminders App

<p align="center">
  <img src="./assets/images/icon.png" width="120" alt="Verso Logo">
</p>

**Verso** is a beautiful, fully-functional cross-platform reminders app built for the RevenueCat Shipyard hackathon, designed specifically for Sam Beckman's brief.

## 🎯 Problem Statement

Sam lives by reminders, but switching between Android and iOS means rebuilding his entire system from scratch. He wants a beautiful, fully functional reminders app on both iOS + Android with:

- ✅ **Custom snoozes from notifications** - Snooze for any duration (5 min, 22 min, 1 hour, etc.) directly from the notification
- ✅ **Powerful recurring rules** - Daily, weekly, monthly, and custom recurrence patterns
- ✅ **True sync** - Dismissing once clears everywhere (coming in Pro version)

## ✨ Features

### Core Features (Free)

- 📝 Create and manage reminders with titles and notes
- ⏰ Set date and time with quick shortcuts
- 🔔 Push notifications with actionable snooze buttons
- 🔄 Basic recurrence (daily, weekly, monthly)
- 🎨 Beautiful dark mode UI with purple/teal accents
- 🏷️ Priority levels (low, medium, high)
- 📱 Works on both iOS and Android

### Pro Features (Subscription)

- ☁️ Cloud sync across all devices
- ♾️ Unlimited reminders
- ⏱️ Custom snooze presets (e.g., 22 minutes)
- 🔁 Advanced recurrence patterns
- 🎨 Additional themes
- 📊 Widgets for home screen

## 🛠️ Tech Stack

- **Framework:** React Native with Expo SDK 54
- **Navigation:** Expo Router (file-based routing)
- **State Management:** React Context + Hooks
- **Storage:** AsyncStorage for local persistence
- **Notifications:** expo-notifications
- **Animations:** react-native-reanimated
- **Monetization:** RevenueCat SDK
- **Language:** TypeScript

## 📱 Screenshots

| Home Screen                     | Add Reminder                  | Snooze Modal                        |
| ------------------------------- | ----------------------------- | ----------------------------------- |
| ![Home](./screenshots/home.png) | ![Add](./screenshots/add.png) | ![Snooze](./screenshots/snooze.png) |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app on your phone (for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/verso.git

# Navigate to project
cd verso

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running on Device

1. Install **Expo Go** on your iOS or Android device
2. Scan the QR code from the terminal
3. The app will load on your device

## 🏗️ Project Structure

```
verso/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home screen (Today's reminders)
│   │   └── explore.tsx    # Upcoming reminders
│   ├── modal.tsx          # Add reminder modal
│   ├── edit-reminder.tsx  # Edit reminder modal
│   ├── settings.tsx       # Settings screen
│   └── paywall.tsx        # Premium subscription paywall
├── components/            # Reusable UI components
│   ├── ReminderCard.tsx   # Reminder list item
│   ├── SnoozeModal.tsx    # Snooze time picker
│   ├── EmptyState.tsx     # Empty list placeholder
│   └── FloatingActionButton.tsx
├── context/               # React Context providers
│   └── RemindersContext.tsx
├── services/              # Business logic services
│   ├── storage.ts         # AsyncStorage wrapper
│   ├── notifications.ts   # Push notification handling
│   └── revenuecat.ts      # Subscription management
├── types/                 # TypeScript definitions
│   └── reminder.ts        # Reminder data types
└── constants/             # App constants
    └── theme.ts           # Colors, spacing, typography
```

## 💰 Monetization Strategy

Verso uses a freemium model powered by **RevenueCat**:

### Free Tier

- Up to 10 active reminders
- Basic recurrence options
- Standard snooze presets
- Local storage only

### Pro Tier ($4.99/month or $39.99/year)

- Unlimited reminders
- Cloud sync across devices
- Custom snooze presets
- Advanced recurrence patterns
- Premium themes
- Home screen widgets

### Why This Works

- Low friction for new users to try the app
- Clear value proposition for power users like Sam
- Recurring revenue for sustainable development
- RevenueCat handles all subscription management

## 🗺️ Roadmap

### Phase 1 (MVP - Hackathon) ✅

- [x] Core reminder CRUD operations
- [x] Push notifications with snooze actions
- [x] Basic recurrence patterns
- [x] Beautiful dark mode UI
- [x] RevenueCat integration

### Phase 2 (Post-Hackathon)

- [ ] Cloud sync with real-time updates
- [ ] Widget support (iOS & Android)
- [ ] Natural language input ("Remind me tomorrow at 3pm")
- [ ] Location-based reminders
- [ ] Apple Watch & Wear OS companion apps

### Phase 3 (Future)

- [ ] Team/family sharing
- [ ] Calendar integration
- [ ] Siri/Google Assistant shortcuts
- [ ] Desktop apps (macOS, Windows)

## 👥 Team

- **Emily Ball** - Design
- **Pip Martin-Yates** - Development

## 📄 License

This project is built for the RevenueCat Shipyard: Creator Contest hackathon.

---

<p align="center">
  Made with ❤️ for Sam Beckman<br>
  <strong>RevenueCat Shipyard 2026</strong>
</p>
