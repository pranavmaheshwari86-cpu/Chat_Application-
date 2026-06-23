# Security & Secret Rotation Guide

## 🔴 IMMEDIATE ACTION REQUIRED

**All secrets in `.env` have been committed to git history and MUST be rotated immediately.**

### Compromised Secrets (from `.env`):
1. **MongoDB Atlas URI** - Contains username/password
2. **JWT_ACCESS_SECRET** - 64-char hex
3. **JWT_REFRESH_SECRET** - 64-char hex
4. **Google OAuth Client Secret**
5. **Cloudinary API Secret**
6. **OpenRouter API Key**
7. **Groq API Key**

---

## 🔄 Rotation Procedure

### 1. MongoDB Atlas
```bash
# In Atlas Console:
# 1. Database Access → Edit user → Change password
# 2. Update MONGODB_URI in all environments
```

### 2. JWT Secrets
```bash
# Generate new secrets:
openssl rand -hex 32
# Update JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
# All existing tokens will be invalidated (users must re-login)
```

### 3. Google OAuth
```bash
# Google Cloud Console → APIs & Services → Credentials
# 1. Regenerate Client Secret
# 2. Update GOOGLE_CLIENT_SECRET
# 3. Update authorized redirect URIs if changed
```

### 4. Cloudinary
```bash
# Cloudinary Dashboard → Settings → Security
# 1. Regenerate API Secret
# 2. Update CLOUDINARY_API_SECRET
```

### 5. OpenRouter / Groq
```bash
# Provider Dashboard → API Keys
# 1. Revoke old key
# 2. Generate new key
# 3. Update OPENROUTER_API_KEY / GROQ_API_KEY
```

---

## 🛡️ Prevention

### Git History Cleanup
```bash
# Option A: BFG Repo-Cleaner (recommended)
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Option B: git-filter-repo
git filter-repo --path .env --invert-paths

# Option C: If repo is new, consider re-initializing
```

### .gitignore (already configured)
Ensures `.env` files are never committed:
```
.env
.env.local
.env.*.local
```

### CI/CD Secret Scanning
Add to pipeline:
```yaml
# GitHub Actions example
- uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: main
    head: HEAD
```

---

## 📋 Environment-Specific Config

### Development
- Use local MongoDB/Redis
- Use mock AI keys (app runs in mock mode)
- JWT secrets can be static for team sharing

### Staging
- Separate MongoDB/Redis instances
- Real AI keys (limited quota)
- Unique JWT secrets

### Production
- Managed MongoDB Atlas (dedicated cluster)
- Managed Redis (ElastiCache/Memorystore)
- Production AI keys with monitoring
- Unique JWT secrets per deployment
- Secrets stored in secret manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault)

---

## 🔐 Secret Manager Integration (Production)

### Example: AWS Secrets Manager
```typescript
// backend/src/config/secret-manager.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

export async function getSecret(name: string): Promise<string> {
  const cmd = new GetSecretValueCommand({ SecretId: name });
  const resp = await client.send(cmd);
  return resp.SecretString || '';
}

// Usage in config files:
export default registerAs('jwt', async () => ({
  accessSecret: await getSecret('flashchat/jwt/access'),
  refreshSecret: await getSecret('flashchat/jwt/refresh'),
}));
```

---

## 🚨 Incident Response

If secrets are exposed in future:
1. **Immediately rotate** the compromised secret
2. **Audit access logs** for unauthorized usage
3. **Force logout** all users if JWT secrets compromised
4. **Notify team** and document in incident log
5. **Update this guide** with lessons learned

---

## ✅ Verification Checklist

After rotation:
- [ ] All services start without errors
- [ ] Authentication flow works (register, login, refresh, logout)
- [ ] WebSocket connections authenticate
- [ ] File uploads work (Cloudinary)
- [ ] AI features work (if keys configured)
- [ ] Google OAuth works
- [ ] Rate limiting works
- [ ] No secrets in git history (`git log --all --full-history -- .env`)