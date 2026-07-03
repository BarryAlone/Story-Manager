# Story Manager

![Status](https://img.shields.io/badge/Status-MVP_In_Development_-orange)
![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=flat&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)

An advanced tool for writers and creators to manage the process of creating books and comic books. It allows you to create, store, and visualize data for narrative projects.

---

## 📖 Table of Contents
1. [🎨 About the Project](#-about-the-project)
2. [⚙️ Architecture and Technologies](#️-architecture-and-technologies)
3. [🚀 Project Status and Roadmap](#-project-status-and-roadmap)
4. [💻 Local Setup](#-local-setup)
5. [📬 Contact](#-contact)
6. [💡 Future Features](#-future-features)
7. [✅ What has been done?](#-what-has-been-done)
---

## 🎨 About the Project
Story Manager is a web application that solves the problem of managing the complex structure of fictional worlds. It replaces dozens of loose notes and text files with a single, coherent relational system. 

**Key features:**
* Management of multiple projects and their chapters.
* Comprehensive character profiles with customizable attributes, global to a given project.
* Adding avatars to specific project elements, as well as auxiliary images serving as a gallery.
* Timeline module allowing for chronological arrangement of events.
* Character relationship graph representing the types of relationships between characters. 

---

## ⚙️ Architecture and Technologies

* **Frontend:** React.js
* **Backend:** PHP, Laravel acting as a REST API
* **Database:** SQLite, development version
* **Authentication:** Laravel Sanctum (*In progress*)

---

## 🚀 Project Status and Roadmap
The project is under active development. The current version is MVP 1.0, focusing on the database architecture and delivering a minimal version of the frontend.

- [x] Relational database design and migration implementation.
- [x] Development of Many-to-Many relationship logic and connections between project elements.
- [x] Initial integration of backend and frontend to operate on database data and test the API.
- [x] Introduction of seeders to generate test data.  
- [ ] Transitioning from static `user_id` assignment to token-based authentication.
- [ ] Full integration of React forms with new API endpoints.
- [ ] Creation of a functional and scalable version of the relationship graph.
- [ ] Creation of a fully functional timeline version.
- [ ] Deployment of a demo version.

> **Important note for testers:** Currently, the login system is suspended in favor of architectural work. The interface automatically assigns a test user with ID 1.

---

## 💻 Local Setup

Instructions for setting up two separate environments on a development machine.

### 📋 Prerequisites
* Node.js & npm
* PHP (min. 8.1) & Composer

### 🔧 Installation and Configuration

```bash
# Clone the repository and navigate to the project folder
git clone https://github.com/BarryAlone/Story-Manager.git story-manager
cd story-manager

# Install PHP and required extensions
sudo apt update && sudo apt install php-cli php-mbstring php-xml php-bcmath php-curl php-sqlite3 unzip curl -y

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# IMPORTANT: After running the above command, close this terminal window completely 
# (to refresh environment variables) and open a new one. Then run:
nvm install 20

# Ensure you are in the main project folder (story-manager), then run:
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link

# Navigate to the frontend directory
cd frontend

# Install npm dependencies
npm install
npm install @tailwindcss/vite tailwindcss
npm install react-force-graph-2d
```

---

## ⚡ Application Scripts

**Frontend:**
* `npm start` - Runs the application in development mode.
* `npm run build` - Builds an optimized, production-ready application.
* `npm run dev` - Starts the frontend. MUST BE RUN FROM INSIDE THE 'frontend' FOLDER.

**Backend:**
* `php artisan serve` - Starts the local test server.
* `php artisan migrate:fresh --seed` - Resets the database and populates it with test data.

---

> **SECTIONS UNDER CONSTRUCTION** 🚧

## 🌐 Live Version 
The demo (production) version is not yet publicly available. The link will appear here once work on API integration and a secure authentication system (Sanctum) is completed.

## 🔑 Access
Once the application is published, credentials for a special test account (Demo User) will be provided here, enabling recruiters and testers to quickly check functionalities without having to register.

## ✅ What has been done?
* Relational database design and migration implementation.
* Development of Many-to-Many relationship logic and connections between project elements.
* Initial integration of backend and frontend to operate on database data and test the API.
* Introduction of seeders to generate test data.

## 💡 Future Features
Beyond achieving the main MVP goals from the Roadmap, future considerations include:
* Modernization and update of UX/UI.
* Adding an AI module for image recognition to automatically categorize attributes/descriptions.
* Automatic outline generation/text editing.

---

## 📬 Contact
A project created with passion. If you have questions, suggestions, or want to talk about code, feel free to contact me:

* **GitHub:** [@BarryAlone](https://github.com/BarryAlone) 
* **LinkedIn:** [Kacper Chwałkowski](https://www.linkedin.com/in/kacper-chwalkowski-836148337/)
* **Email:** kac.chw.1994@gmail.com