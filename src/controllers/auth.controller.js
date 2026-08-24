const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controlador de autenticacion (login y perfil).
 */
class AuthController {
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    res.json(await authService.login(email, password));
  });

  me = asyncHandler(async (req, res) => {
    res.json(await authService.perfil(req.user.id));
  });
}

module.exports = new AuthController();
