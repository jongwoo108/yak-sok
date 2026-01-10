# Yak-Sok (약속)

<div align="center">
  <h3>The Golden-Time Safety Line for Seniors</h3>
  <p>
    Medication Management & Emergency Response System<br />
    Building a digital safety net for the aging population.
  </p>
</div>

## About Yak-Sok
**Yak-Sok** interprets medication adherence not just as a health metric, but as a vital **"Life-Sign"**. It bridges the digital divide for the elderly while establishing a robust social safety net.

Designed with a **"3D Pastel Claymorphism"** aesthetic, it offers an accessible, high-contrast interface for seniors and a sophisticated monitoring dashboard for guardians.

## Features

### 👴 Senior-Centric Experience
- **Accessible Design**: High contrast, large touch targets (48px+), and a cognitive-load-free interface.
- **Automated Input**: OpenAI-powered Prescription OCR and Voice Command integration (STT).
- **Progressive Web App (PWA)**: Installable directly to the home screen with offline capabilities.

### 🛡️ Golden-Time Safety Line
- **Real-time Monitoring**: Automated detection of missed doses.
- **Hierarchical Alerts**:
  - **Level 1**: Gentle reminder to the senior.
  - **Level 2**: Push notification to registered guardians via Firebase Cloud Messaging (FCM).
  - **Level 3**: Emergency contact protocol activation.

### 🔐 Security & Auth
- **Role-Based Access**: Specialized interfaces for Seniors and Guardians.
- **Secure Authentication**: Google OAuth integration backed by Firebase Admin verification.

## Tech Stack

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), [TypeScript](https://www.typescriptlang.org/), [Zustand](https://github.com/pmndrs/zustand), [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Django REST Framework](https://www.django-rest-framework.org/), [Python 3.11+](https://www.python.org/)
- **Infrastructure**: [Docker](https://www.docker.com/), [PostgreSQL](https://www.postgresql.org/), [Redis](https://redis.io/), [Celery](https://docs.celeryq.dev/)
- **AI Services**: [OpenAI GPT-4o](https://openai.com/) (Vision), [Whisper](https://openai.com/research/whisper)

## Developer Quickstart

To run Yak-Sok locally, you will need **Docker** and **Docker Compose** installed.

### 1. Clone the repository
```bash
git clone https://github.com/jongwoo108/yak-sok.git
cd yak-sok
```

### 2. Setup Environment Variables
Copy the example environment files and configure your API keys (OpenAI, Firebase).
```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
```

### 3. Run with Docker Compose
This will spin up the Backend (Django), Frontend (Next.js), PostgreSQL, and Redis containers.
```bash
docker-compose up -d --build
```

#### Access Points
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000/api](http://localhost:8000/api)
- **Admin Panel**: [http://localhost:8000/admin](http://localhost:8000/admin)

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on how to submit pull requests, report issues, and request features.

## License

This project is licensed under the **MIT License**.

---
<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/jongwoo108">Jongwoo Shin</a></sub>
</div>