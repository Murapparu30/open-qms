# OpenQMS (Quality Management System)

A modern, open-source Quality Management System designed for Small and Medium-sized Businesses (SMBs) in regulated industries (GxP).

![Dashboard Preview](./public/dashboard-preview.png)

## 🌟 Key Features

*   **Compliance Ready**: Built with **21 CFR Part 11** in mind (Electronic Records, Electronic Signatures).
*   **Module-Based**:
    *   **Deviations**: Track unexpected events with Containment, RCA, and CAPA integration.
    *   **CAPA**: Corrective and Preventive Actions with effectiveness verification.
    *   **Complaints**: Customer complaint handling with bidirectional traceability to Deviations.
    *   **Change Control**: Manage changes to documents, processes, and equipment.
*   **Audit Trail**: Comprehensive, tamper-evident logs for all critical actions (Who, When, What, Why).
*   **Traceability**: One-click navigation between related records (e.g., Complaint -> Deviation -> CAPA).
*   **Reports**: Instant PDF generation (Japanese font supported) for audits and reviews.

## 🚀 Tech Stack

*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **ORM**: [Prisma](https://www.prisma.io/)
*   **UI**: [DaisyUI](https://daisyui.com/) + [TailwindCSS](https://tailwindcss.com/)
*   **PDF**: [@react-pdf/renderer](https://react-pdf.org/)
*   **Auth**: [NextAuth.js](https://next-auth.js.org/)

## 🛠️ Getting Started

### Prerequisites

*   Node.js 18+
*   PostgreSQL (Local or Cloud)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/open-qms.git
    cd open-qms
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    ```bash
    cp .env.example .env
    # Edit .env with your DATABASE_URL and NEXTAUTH_SECRET
    ```

4.  Initialize the database:
    ```bash
    npx prisma migrate dev
    npx prisma db seed
    ```

5.  Run the development server:
    ```bash
    npm run dev
    ```

## 📦 Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions on how to deploy to Vercel, Railway, or Docker.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
