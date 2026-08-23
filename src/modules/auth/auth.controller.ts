import { Request, Response } from 'express';
import { ValidationError } from '../../common/errors';
import { authService, AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from './auth.schema';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed',
        parseResult.error.flatten().fieldErrors
      );
    }

    const result = await this.service.register(parseResult.data);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed',
        parseResult.error.flatten().fieldErrors
      );
    }

    const result = await this.service.login(parseResult.data);
    res.status(200).json(result);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const parseResult = refreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed',
        parseResult.error.flatten().fieldErrors
      );
    }

    const result = await this.service.refresh(parseResult.data);
    res.status(200).json(result);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const parseResult = logoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed',
        parseResult.error.flatten().fieldErrors
      );
    }

    await this.service.logout(parseResult.data);
    res.status(204).send();
  };
}

export const authController = new AuthController();
