import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dataService } from '../services/dataService';
import { config } from '../config';
import { AuthenticatedRequest } from '../types';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      res.status(400).json({ message: 'Le nom complet est obligatoire.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ message: 'Une adresse e-mail valide est obligatoire.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ message: 'Le mot de passe doit comporter au moins 6 caractères.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await dataService.getUserByEmail(normalizedEmail);
    if (existingUser) {
      res.status(400).json({ message: 'Un compte avec cette adresse email existe déjà.' });
      return;
    }

    // Hachage sécurisé du mot de passe
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Création de l'utilisateur
    const user = await dataService.createUser({
      full_name: full_name.trim(),
      email: normalizedEmail,
      password_hash,
    });

    // Génération du JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email et mot de passe requis.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userWithPassword = await dataService.getUserByEmail(normalizedEmail);

    if (!userWithPassword) {
      res.status(401).json({ message: 'Identifiants de connexion incorrects.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, userWithPassword.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ message: 'Identifiants de connexion incorrects.' });
      return;
    }

    const token = jwt.sign(
      { userId: userWithPassword.id, email: userWithPassword.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.status(200).json({
      token,
      user: {
        id: userWithPassword.id,
        full_name: userWithPassword.full_name,
        email: userWithPassword.email,
        created_at: userWithPassword.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Non autorisé.' });
      return;
    }

    const user = await dataService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé.' });
      return;
    }

    res.status(200).json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      created_at: user.created_at,
    });
  } catch (error) {
    next(error);
  }
};
