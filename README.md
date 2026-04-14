# ClientStream: AI-Powered Lead Discovery & CRM

ClientStream is a next-generation business intelligence and CRM platform that automates the process of finding, extracting, and managing high-quality business leads. By combining real-time web scraping with advanced AI extraction, ClientStream transforms unstructured web data into actionable business opportunities.

## 🚀 Key Features

### 1. AI-Powered Lead Discovery
ClientStream can browse the web to find potential clients. It uses **Playwright** for deep-web scraping and **OpenAI (GPT-4o-mini)** to intelligently extract:
- Business names and services
- Locations and contact information (Phone/Email)
- Concise business descriptions

### 2. Intelligent CRM Dashboard
A centralized hub for managing your entire sales pipeline:
- **Lead Scoring**: Automatically rank leads based on their potential.
- **Status Tracking**: Move leads through stages from "New" to "Closed".
- **Bulk Import**: Seamlessly add hundreds of AI-discovered leads with a single click.

### 3. Real-Time Communication
Never miss an update with integrated **Socket.io** support:
- Live chat interface for internal or external communication.
- Instant notifications for lead updates and system actions.

### 4. Advanced Analytics & Insights
Visual data representation to help you understand your growth:
- Distribution by lead source and status.
- Performance metrics and lead quality scoring.
- Activity history and follow-up tracking.

### 5. Automated Follow-Up Simulation
Built-in tools to simulate and track lead engagement, ensuring consistent follow-ups and improving conversion rates.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

### Backend
- **Server**: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Real-Time**: [Socket.io](https://socket.io/)
- **Web Scraping**: [Playwright](https://playwright.dev/)
- **Artificial Intelligence**: [OpenAI API](https://openai.com/api/)

## 📂 Project Structure

```bash
LeadApp/
├── frontend/          # Next.js application
│   ├── app/           # Dashboard, Chat, and Analytics routes
│   ├── components/    # Reusable UI components
│   └── lib/           # API clients and utilities
└── backend/           # Express server
    ├── routes/        # API endpoints (leads, chat)
    ├── services/      # AI extraction & scraping logic
    ├── models/        # MongoDB schemas
    └── server.js      # Main entry point & Socket.io setup
```

## 🚥 Getting Started

### Prerequisites
- Node.js (LTS version)
- MongoDB account (local or Atlas)
- OpenAI API Key
- Clerk API Keys

### Installation
1. Clone the repository.
2. Install dependencies in both folders:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Configure `.env` files in both directories based on the provided examples.
4. Start the development servers:
   - Backend: `npm run dev` (starts on port 5000)
   - Frontend: `npm run dev` (starts on port 3000)

---
*Built with ❤️ for modern sales teams.*
