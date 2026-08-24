-- Corrige la contrasena del usuario cliente (por si el hash se corrompio al pegar).
-- Contrasena: cliente123
update usuario set password_hash = '$2a$10$SEX8ramyv3td9154X1qWkeiOZp9I7iuRFKPHJHpHCYh4ss.DVm0mG' where email = 'carla@autorent.pe';
