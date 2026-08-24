const { Router } = require('express');
const auth = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/login', auth.login);   // { email, password } -> { token, usuario }
router.get('/me', autenticar, auth.me); // perfil del usuario autenticado

module.exports = router;
