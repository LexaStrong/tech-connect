# Tech Connect 🚀

Tech Connect is a modern, high-performance community platform for developers, designers, and tech visionaries. Built with a focus on speed, aesthetics, and privacy, it provides a space for innovators to share ideas, collaborate on projects, and grow together.

![Tech Connect Hero](assets/images/hero.png)

## ✨ Features

- **Supabase Integration**: Real-time authentication and persistent data storage.
- **24-Hour Ephemeral Content**: Posts and messages expire after 24 hours to keep the community fresh and relevant.
- **Customizable Profiles**: Personalize your profile with tech-themed avatars and programming language icons.
- **TKPoints System**: Earn points for engaging with the community and helping others.
- **Theme Support**: Seamless toggle between light and dark modes.
- **Responsive Design**: Optimized for both desktop and mobile experiences.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **Storage**: Supabase Storage for rich media attachments
- **Typography**: Inter & Space Grotesk (Google Fonts)

## 🚀 Getting Started

### Prerequisites

- A [Supabase](https://supabase.com/) account.
- Basic knowledge of HTML/JS.

### Backend Setup

1. **Create a Project**: Create a new project in your Supabase dashboard.
2. **Database Schema**: Execute the provided [supabase_schema.sql](supabase_schema.sql) in the Supabase SQL Editor to initialize tables and Row Level Security (RLS) policies.
3. **Storage Buckets**: Create two public storage buckets named `posts` and `avatars`.
4. **Configuration**: Update `js/supabase-config.js` with your project URL and Anon Key.

### Running Locally

Simply open `index.html` in your browser or use a local development server like VS Code Live Server.

```bash
# Clone the repository
git clone https://github.com/LexaStrong/tech-connect.git

# Open the project
cd tech-connect
```

## 🔐 Security

Tech Connect uses **Row Level Security (RLS)** to ensure that user data is protected. Even though the Supabase Anon Key is used on the frontend, users can only modify their own data and view content allowed by the community policies.

## 📄 License

This project is licensed under the MIT License.
