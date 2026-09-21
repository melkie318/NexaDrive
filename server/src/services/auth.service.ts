import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import { config } from '../config/env';
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from '../validations/auth.validation';



async function issueTokens(
  userId: string,
  payload: {
    id: string;
    name?: string | null;
    email: string;
    username: string;
    role: import('@prisma/client').Role;
  }
) {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });
  return { accessToken, refreshToken };
}

async function generateUniqueUsername(base: string): Promise<string> {
  const cleaned = base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
  let candidate = `${cleaned}_${Math.floor(1000 + Math.random() * 9000)}`;
  // Ensure uniqueness
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    candidate = `${cleaned}_${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return candidate;
}

function formatUser(user: {
  id: string;
  name: string | null;
  email: string;
  username: string;
  role: import('@prisma/client').Role;
  avatar: string | null;
  storageQuota: bigint;
  usedStorage: bigint;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    avatar: user.avatar,
    storageQuota: user.storageQuota.toString(),
    usedStorage: user.usedStorage.toString(),
  };
}

// ─── OAuth Provider API calls ─────────────────────────────────────────────────

interface OAuthProfile {
  providerUserId: string;
  email: string;
  name?: string;
  avatar?: string;
}

async function getGoogleProfile(code: string): Promise<OAuthProfile> {
  // Exchange code for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.oauth.google.clientId,
      client_secret: config.oauth.google.clientSecret,
      redirect_uri: config.oauth.google.callbackUrl,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    throw new AppError('Failed to exchange Google authorization code', 400);
  }

  const tokenData = await tokenRes.json() as { access_token: string };

  // Fetch user profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    throw new AppError('Failed to fetch Google profile', 400);
  }

  const profile = await profileRes.json() as {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };

  return {
    providerUserId: profile.id,
    email: profile.email,
    name: profile.name,
    avatar: profile.picture,
  };
}

async function getGithubProfile(code: string): Promise<OAuthProfile> {
  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.oauth.github.clientId,
      client_secret: config.oauth.github.clientSecret,
      code,
      redirect_uri: config.oauth.github.callbackUrl,
    }),
  });

  if (!tokenRes.ok) {
    throw new AppError('Failed to exchange GitHub authorization code', 400);
  }

  const tokenData = await tokenRes.json() as { access_token: string };

  // Fetch user profile
  const profileRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!profileRes.ok) {
    throw new AppError('Failed to fetch GitHub profile', 400);
  }

  const profile = await profileRes.json() as {
    id: number;
    login: string;
    name?: string;
    avatar_url?: string;
    email?: string;
  };

  // GitHub may not expose email — fetch from /user/emails
  let email = profile.email;
  if (!email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (emailRes.ok) {
      const emails = await emailRes.json() as { email: string; primary: boolean; verified: boolean }[];
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email ?? emails[0]?.email;
    }
  }

  if (!email) {
    // Fallback to noreply GitHub email
    email = `${profile.login}@users.noreply.github.com`;
  }

  return {
    providerUserId: String(profile.id),
    email,
    name: profile.name || profile.login,
    avatar: profile.avatar_url,
  };
}

// ─── Find or create user from OAuth profile ───────────────────────────────────

async function findOrCreateOAuthUser(provider: string, profile: OAuthProfile) {
  const { providerUserId, email, name, avatar } = profile;

  // 1. Check existing OAuth account link
  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUserId: { provider, providerUserId } },
    include: { user: true },
  });

  if (existingOAuth) {
    const user = existingOAuth.user;
    if (!user.isActive) throw new AppError('User account is deactivated', 401);

    // Update avatar if they now have one
    if (avatar && !user.avatar) {
      await prisma.user.update({ where: { id: user.id }, data: { avatar } });
    }

    return await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  }

  // 2. Match by email — link this provider to existing account
  const existingByEmail = await prisma.user.findUnique({ where: { email } });

  if (existingByEmail) {
    if (!existingByEmail.isActive) throw new AppError('User account is deactivated', 401);

    await prisma.oAuthAccount.create({
      data: { userId: existingByEmail.id, provider, providerUserId },
    });

    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        avatar: existingByEmail.avatar || avatar,
        isEmailVerified: true,
        name: existingByEmail.name || name,
      },
    });

    return await prisma.user.findUniqueOrThrow({ where: { id: existingByEmail.id } });
  }

  // 3. Auto-provision brand-new account (no password required for OAuth-only accounts)
  const baseName = name || email.split('@')[0];
  const uniqueUsername = await generateUniqueUsername(baseName);

  const newUser = await prisma.user.create({
    data: {
      email,
      name: baseName,
      username: uniqueUsername,
      avatar,
      isEmailVerified: true,
      storageQuota: BigInt(549755813888), // 512 GB
      oauthAccounts: { create: { provider, providerUserId } },
    },
  });

  await prisma.activity.create({
    data: { userId: newUser.id, action: 'REGISTER', details: JSON.stringify({ provider, email }) },
  });

  return newUser;
}

// ─── AuthService ──────────────────────────────────────────────────────────────

export class AuthService {
  /**
   * Standard registration (name, email, username, password all required)
   */
  static async register(data: RegisterInput) {
    if (await prisma.user.findUnique({ where: { email: data.email } })) {
      throw new AppError('Email address is already registered', 400);
    }
    if (await prisma.user.findUnique({ where: { username: data.username } })) {
      throw new AppError('Username is already taken', 400);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        username: data.username,
        passwordHash,
        storageQuota: BigInt(549755813888),
      },
    });

    const payload = { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role };
    const { accessToken, refreshToken } = await issueTokens(user.id, payload);

    await prisma.activity.create({
      data: { userId: user.id, action: 'REGISTER', details: JSON.stringify({ email: user.email }) },
    });

    return { user: formatUser(user), accessToken, refreshToken };
  }

  /**
   * Standard email + password login
   */
  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !user.isActive) throw new AppError('Invalid email or password', 401);
    if (!user.passwordHash) throw new AppError('This account uses social login. Please continue with Google or GitHub.', 400);

    const valid = await comparePassword(data.password, user.passwordHash);
    if (!valid) throw new AppError('Invalid email or password', 401);

    const payload = { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role };
    const { accessToken, refreshToken } = await issueTokens(user.id, payload);

    await prisma.activity.create({
      data: { userId: user.id, action: 'LOGIN', details: JSON.stringify({ email: user.email }) },
    });

    return { user: formatUser(user), accessToken, refreshToken };
  }

  /**
   * Generate the OAuth consent redirect URL for Google
   */
  static getGoogleAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: config.oauth.google.clientId,
      redirect_uri: config.oauth.google.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Generate the OAuth consent redirect URL for GitHub
   */
  static getGithubAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: config.oauth.github.clientId,
      redirect_uri: config.oauth.github.callbackUrl,
      scope: 'user:email read:user',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle Google OAuth callback — exchange code, fetch profile, find/create user
   */
  static async handleGoogleCallback(code: string) {
    const profile = await getGoogleProfile(code);
    const user = await findOrCreateOAuthUser('GOOGLE', profile);

    const payload = { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role };
    const { accessToken, refreshToken } = await issueTokens(user.id, payload);

    await prisma.activity.create({
      data: { userId: user.id, action: 'OAUTH_LOGIN', details: JSON.stringify({ provider: 'GOOGLE' }) },
    });

    return { user: formatUser(user), accessToken, refreshToken };
  }

  /**
   * Handle GitHub OAuth callback — exchange code, fetch profile, find/create user
   */
  static async handleGithubCallback(code: string) {
    const profile = await getGithubProfile(code);
    const user = await findOrCreateOAuthUser('GITHUB', profile);

    const payload = { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role };
    const { accessToken, refreshToken } = await issueTokens(user.id, payload);

    await prisma.activity.create({
      data: { userId: user.id, action: 'OAUTH_LOGIN', details: JSON.stringify({ provider: 'GITHUB' }) },
    });

    return { user: formatUser(user), accessToken, refreshToken };
  }

  /**
   * Refresh Access Token with rotation
   */
  static async refreshToken(token: string) {
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError('Refresh token expired or revoked', 401);
    }

    if (!storedToken.user || !storedToken.user.isActive) {
      throw new AppError('User account not found or deactivated', 401);
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const payload = {
      id: storedToken.user.id,
      name: storedToken.user.name,
      email: storedToken.user.email,
      username: storedToken.user.username,
      role: storedToken.user.role,
    };

    const { accessToken, refreshToken } = await issueTokens(storedToken.user.id, payload);
    return { accessToken, refreshToken };
  }

  /**
   * Logout — revoke refresh token
   */
  static async logout(token: string) {
    if (token) await prisma.refreshToken.deleteMany({ where: { token } });
    return true;
  }

  /**
   * Change password
   */
  static async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const isValid = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isValid) throw new AppError('Current password is incorrect', 400);

    const newPasswordHash = await hashPassword(data.newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newPasswordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.activity.create({ data: { userId, action: 'PASSWORD_CHANGE' } });

    return true;
  }

  /**
   * Forgot password
   */
  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return true;

    const resetToken = generateAccessToken({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    return { message: 'Password reset link sent to email', resetToken };
  }

  /**
   * Reset password
   */
  static async resetPassword(data: ResetPasswordInput) {
    let decoded;
    try {
      decoded = verifyRefreshToken(data.token);
    } catch {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) throw new AppError('User not found', 404);

    const newPasswordHash = await hashPassword(data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return true;
  }
}
