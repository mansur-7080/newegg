# GitHub Repository Setup Guide

## 🚀 GitHub'da Repository Yaratish

### 1. GitHub.com da repository yarating

1. [GitHub.com](https://github.com) ga kiring
2. **New repository** tugmasini bosing yoki [github.com/new](https://github.com/new) ga o'ting
3. Quyidagilarni kiriting:
   - **Repository name:** `ecommerce-platform`
   - **Description:** `Enterprise-grade e-commerce platform with microservices architecture`
   - **Public** yoki **Private** tanlang
   - ❌ **"Initialize this repository with a README"** belgilamang (bizda README bor)
   - ❌ **.gitignore** tanlamang (bizda .gitignore bor)
   - ❌ **License** tanlamang (bizda LICENSE bor)
4. **Create repository** tugmasini bosing

### 2. Local repository'ni setup qiling

Terminal/PowerShell da quyidagi komandalarni bajaring:

```bash
# 1. Setup script'ni ishga tushiring (optional)
chmod +x setup-project.sh
./setup-project.sh

# 2. Git repository'ni initialize qiling
git init

# 3. Barcha fayllarni qo'shing
git add .

# 4. Birinchi commit
git commit -m "Initial commit: Complete e-commerce platform documentation and setup"

# 5. Main branch'ga o'ting
git branch -M main

# 6. GitHub repository'ni qo'shing (USERNAME ni o'zgartiring!)
git remote add origin https://github.com/YOUR_USERNAME/ecommerce-platform.git

# 7. GitHub'ga push qiling
git push -u origin main
```

### 3. Repository sozlamalari

GitHub'da repository'ga kirganingizdan keyin:

#### Branch Protection (Settings > Branches)
1. **Add rule** bosing
2. Branch name pattern: `main`
3. Belgilang:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

#### Secrets (Settings > Secrets and variables > Actions)
Keyinchalik qo'shish kerak bo'ladi:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DOCKER_HUB_USERNAME`
- `DOCKER_HUB_TOKEN`

### 4. Loyihani boshlash

```bash
# Development branch yarating
git checkout -b develop
git push -u origin develop

# Feature branch yarating
git checkout -b feature/user-service-setup
```

## 📋 Keyingi qadamlar

1. **Wiki** yoqing va documentation'larni ko'chiring
2. **Issues** da birinchi tasks yarating:
   - [ ] Setup AWS infrastructure
   - [ ] Create User Service
   - [ ] Setup CI/CD pipeline
   - [ ] Create API Gateway

3. **Projects** tab'da kanban board yarating

4. **Collaborators** qo'shing (agar jamoa bo'lsa)

## 🔗 Foydali GitHub Features

- **GitHub Actions:** CI/CD uchun (`.github/workflows/main.yml` tayyor)
- **Dependabot:** Security updates uchun
- **GitHub Pages:** Documentation hosting uchun
- **GitHub Packages:** Docker images uchun

## ⚡ Quick Commands

```bash
# Status tekshirish
git status

# Branch ko'rish
git branch -a

# Pull latest changes
git pull origin main

# Create new feature
git checkout -b feature/new-feature

# Push changes
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

---

**Tabriklayman! 🎉** Sizning GitHub repository tayyor! 