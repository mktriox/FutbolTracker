-- PostgreSQL Schema for Futbol Tracker

--CREATE SCHEMA FutbolTracker;
DROP SCHEMA IF EXISTS UnionCatolica CASCADE;
CREATE SCHEMA UnionCatolica;

-- Drop existing types and tables if they exist (for easy recreation)
--DROP TABLE IF EXISTS UnionCatolica.global_settings CASCADE;
--DROP TABLE IF EXISTS UnionCatolica.suspensions CASCADE;
--DROP TABLE IF EXISTS UnionCatolica.team_stats CASCADE;
--DROP TABLE IF EXISTS UnionCatolica.match_results CASCADE;
--DROP TABLE IF EXISTS UnionCatolica.matches CASCADE;
--DROP TABLE IF EXISTS UnionCatolica.players CASCADE;
--DROP TABLE IF EXISTS UnionCatolica.clubs CASCADE;
--DROP TYPE IF EXISTS UnionCatolica.suspension_unit_enum;
--DROP TYPE IF EXISTS UnionCatolica.category_enum;


-- Define ENUM Types

CREATE TYPE UnionCatolica.category_enum AS ENUM (
  'Sub12',
  'Sub14',
  'Sub16',
  'Sub18',
  'Senior 45',
  'Senior 35',
  'Senior 50',
  'Segunda',
  'Primera',
  'Honor'
);

CREATE TYPE UnionCatolica.suspension_unit_enum AS ENUM (
  'days',   -- Calendar days
  'dates',  -- Match dates/weekends
  'months'  -- Calendar months
);

-- Create Tables

-- Clubs Table
CREATE TABLE UnionCatolica.clubs (
    id VARCHAR(255) PRIMARY KEY, -- Using VARCHAR based on current app structure (e.g., 'club-1')
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE UnionCatolica.clubs IS 'Stores information about participating football clubs.';

-- Players Table
CREATE TABLE UnionCatolica.players (
    id VARCHAR(255) PRIMARY KEY, -- Consider UUID default gen_random_uuid() for stronger uniqueness
    rut VARCHAR(12) NOT NULL UNIQUE, -- Formatted RUT, e.g., '12.345.678-9'. Acts as a natural key.
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    club_id VARCHAR(255) NOT NULL,
    category category_enum NOT NULL,
    -- age INTEGER, -- Age can be calculated dynamically, better not to store unless needed for performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES UnionCatolica.clubs (id) ON DELETE RESTRICT -- Prevent deleting club if players exist? Or CASCADE? RESTRICT seems safer initially.
);
CREATE INDEX idx_players_rut ON UnionCatolica.players(rut);
CREATE INDEX idx_players_club_id ON UnionCatolica.players(club_id);
COMMENT ON TABLE UnionCatolica.players IS 'Stores information about registered players.';
COMMENT ON COLUMN UnionCatolica.players.rut IS 'Formatted Chilean RUT (Rol Único Tributario). Must be unique.';

-- Matches Table
CREATE TABLE UnionCatolica.matches (
    id VARCHAR(255) PRIMARY KEY, -- Consider UUID default gen_random_uuid()
    local_club_id VARCHAR(255) NOT NULL,
    visitor_club_id VARCHAR(255) NOT NULL,
    match_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (local_club_id) REFERENCES UnionCatolica.clubs (id) ON DELETE CASCADE,
    FOREIGN KEY (visitor_club_id) REFERENCES UnionCatolica.clubs (id) ON DELETE CASCADE,
    CHECK (local_club_id <> visitor_club_id) -- Ensure local and visitor teams are different
);
CREATE INDEX idx_matches_date ON UnionCatolica.matches(match_date);
COMMENT ON TABLE UnionCatolica.matches IS 'Stores information about scheduled or played matches between clubs.';

-- Match Results Table (Scores per category per match)
CREATE TABLE UnionCatolica.match_results (
    id SERIAL PRIMARY KEY, -- Simple primary key for this relation
    match_id VARCHAR(255) NOT NULL,
    category category_enum NOT NULL,
    local_goals INTEGER CHECK (local_goals IS NULL OR local_goals >= 0), -- Nullable as per TS type, must be non-negative if entered
    visitor_goals INTEGER CHECK (visitor_goals IS NULL OR visitor_goals >= 0), -- Nullable as per TS type, must be non-negative if entered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES UnionCatolica.matches (id) ON DELETE CASCADE,
    UNIQUE (match_id, category) -- Ensure only one result per category per match
);
COMMENT ON TABLE UnionCatolica.match_results IS 'Stores the scores for each category within a specific match.';

-- Team Stats Table (Represents calculated state per category)
-- This table mirrors the state managed in the application and would be updated
-- by application logic or potentially database triggers after match results are entered/updated.
CREATE TABLE UnionCatolica.team_stats (
    id SERIAL PRIMARY KEY,
    club_id VARCHAR(255) NOT NULL,
    category category_enum NOT NULL,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    played INTEGER NOT NULL DEFAULT 0 CHECK (played >= 0),
    won INTEGER NOT NULL DEFAULT 0 CHECK (won >= 0),
    drawn INTEGER NOT NULL DEFAULT 0 CHECK (drawn >= 0),
    lost INTEGER NOT NULL DEFAULT 0 CHECK (lost >= 0),
    goals_for INTEGER NOT NULL DEFAULT 0 CHECK (goals_for >= 0),
    goals_against INTEGER NOT NULL DEFAULT 0 CHECK (goals_against >= 0),
    goal_difference INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES UnionCatolica.clubs (id) ON DELETE CASCADE,
    UNIQUE (club_id, category) -- Ensure one stats record per club per category
);
COMMENT ON TABLE UnionCatolica.team_stats IS 'Stores calculated statistics for each team in each category.';
COMMENT ON COLUMN UnionCatolica.team_stats.goal_difference IS 'Calculated as goals_for - goals_against.';

-- Suspensions Table
CREATE TABLE UnionCatolica.suspensions (
    id VARCHAR(255) PRIMARY KEY, -- Consider UUID default gen_random_uuid()
    player_rut VARCHAR(12) NOT NULL, -- Use RUT to link to the player
    start_date DATE NOT NULL,
    duration INTEGER NOT NULL CHECK (duration >= 1),
    unit suspension_unit_enum NOT NULL,
    end_date DATE NOT NULL, -- Store the calculated end date
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- Optional: Add a direct foreign key if players.rut is guaranteed unique and indexed
    -- FOREIGN KEY (player_rut) REFERENCES players (rut) ON DELETE CASCADE
    -- Note: Foreign key on non-primary key (rut) might have performance implications.
    -- Ensure players.rut has a UNIQUE constraint and index.
);
CREATE INDEX idx_suspensions_player_rut ON UnionCatolica.suspensions(player_rut);
CREATE INDEX idx_suspensions_end_date ON UnionCatolica.suspensions(end_date);
COMMENT ON TABLE UnionCatolica.suspensions IS 'Stores suspension records for players.';
COMMENT ON COLUMN UnionCatolica.suspensions.player_rut IS 'Links to the player via their formatted RUT.';
COMMENT ON COLUMN UnionCatolica.suspensions.end_date IS 'Calculated date when the suspension ends.';


-- Global Settings Table (for Sub12 finalization status)
CREATE TABLE UnionCatolica.global_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE UnionCatolica.global_settings IS 'Stores global application settings, like Sub12 finalization status.';

-- Initialize Sub12 finalization status
INSERT INTO UnionCatolica.global_settings (setting_key, setting_value)
VALUES ('sub12_finalized', 'false')
ON CONFLICT (setting_key) DO NOTHING; -- Prevent error if already exists


-- Functions/Triggers (Optional, for automatic updates)

-- Function to update timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to tables
CREATE TRIGGER set_timestamp_clubs
BEFORE UPDATE ON UnionCatolica.clubs
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_players
BEFORE UPDATE ON UnionCatolica.players
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_matches
BEFORE UPDATE ON UnionCatolica.matches
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_match_results
BEFORE UPDATE ON UnionCatolica.match_results
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_team_stats
BEFORE UPDATE ON UnionCatolica.team_stats
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_suspensions
BEFORE UPDATE ON UnionCatolica.suspensions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_global_settings
BEFORE UPDATE ON UnionCatolica.global_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Seed Initial Data (Optional)
-- Example: Insert clubs based on your INITIAL_CLUBS definition
-- You would need to adapt this if your ClubRanking interface changes or if IDs are different.

INSERT INTO UnionCatolica.clubs (id, name) VALUES
('club-1', 'Union Catolica'),
('club-2', 'Union Mardones'),
('club-3', 'Real Oriente'),
('club-4', 'Irene Frei'),
('club-5', 'Colo colo Zañartu'),
('club-6', 'Ferroviarios'),
('club-7', 'Estadio'),
('club-8', 'Roberto Mateos'),
('club-9', 'Atlanta'),
('club-10', 'Nacional'),
('club-11', 'Vicuña Mackenna'),
('club-12', 'Buenos Amigos'),
('club-13', 'Real Zaragoza'),
('club-14', 'El Sauce'),
('club-15', 'Manuel Rodriguez'),
('club-16', 'Lautaro'),
('club-17', 'San Martin'),
('club-18', 'Avance'),
('club-19', 'San Miguel'),
('club-20', 'Unión'),
('club-21', 'San Luis'),
('club-22', 'Chillan Viejo'),
('club-23', 'El Lucero'),
('club-24', 'Junior'),
('club-25', 'Unión Española'),
('club-26', 'EL Chile'),
('club-27', 'Cóndor'),
('club-28', 'Estrella del Pacífico'),
('club-29', 'Cruz Azul'),
('club-30', '21 de Diciembre'),
('club-31', 'Barrabases'),
('club-32', 'El Tejar')
ON CONFLICT (id) DO NOTHING; -- Prevent errors if run multiple times

-- Initialize team_stats for each club and category
INSERT INTO UnionCatolica.team_stats (club_id, category, points, played, won, drawn, lost, goals_for, goals_against, goal_difference)
SELECT
    c.id AS club_id,
    cat.category_name AS category,
    0 AS points,
    0 AS played,
    0 AS won,
    0 AS drawn,
    0 AS lost,
    0 AS goals_for,
    0 AS goals_against,
    0 AS goal_difference
FROM
    UnionCatolica.clubs c
CROSS JOIN
    (SELECT unnest(enum_range(NULL::category_enum)) AS category_name) AS cat
ON CONFLICT (club_id, category) DO NOTHING; -- Prevent errors if run multiple times


-- Note: Further triggers could be added to automatically update team_stats
-- when match_results are inserted or updated, but this logic is currently handled
-- in the application layer (useRankings hook). Implementing it in the database
-- would centralize the logic but increase database complexity.

-- Add a function to calculate Sub12 bonus points
CREATE OR REPLACE FUNCTION calculate_sub12_bonus(rank INTEGER)
RETURNS INTEGER AS $$
DECLARE
    bonus_points INTEGER;
    distribution INTEGER[] := ARRAY[100, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25]; -- Match your TS array
BEGIN
    IF rank > 0 AND rank <= array_length(distribution, 1) THEN
        bonus_points := distribution[rank];
    ELSIF rank > array_length(distribution, 1) THEN
        bonus_points := distribution[array_length(distribution, 1)]; -- Last value for subsequent ranks
    ELSE
        bonus_points := 0; -- Rank 0 or less gets no points
    END IF;
    RETURN bonus_points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add a column to store total points in the clubs table
ALTER TABLE UnionCatolica.clubs ADD COLUMN total_points INTEGER DEFAULT 0;


-- Function to update general points based on Sub12 status
CREATE OR REPLACE FUNCTION update_general_points(club_id_to_update VARCHAR(255))
RETURNS VOID AS $$
DECLARE
    sub12_finalized BOOLEAN;
    sub12_rank INTEGER;
    sub12_bonus INTEGER;
    non_sub12_points INTEGER;
BEGIN
    -- Check Sub12 finalization status
    SELECT setting_value::BOOLEAN INTO sub12_finalized FROM global_settings WHERE setting_key = 'sub12_finalized';

    -- Calculate points from non-Sub12 categories
    SELECT COALESCE(SUM(points), 0) INTO non_sub12_points
    FROM UnionCatolica.team_stats
    WHERE club_id = club_id_to_update AND category <> 'Sub12';

    IF sub12_finalized THEN
        -- Calculate Sub12 rank
        WITH sub12_ranking AS (
            SELECT
                club_id,
                RANK() OVER (ORDER BY points DESC, goal_difference DESC, goals_for DESC, club_id ASC) as rank
            FROM UnionCatolica.team_stats
            WHERE category = 'Sub12'
        )
        SELECT rank INTO sub12_rank FROM sub12_ranking WHERE club_id = club_id_to_update;

        -- Calculate bonus points
        sub12_bonus := calculate_sub12_bonus(sub12_rank);

        -- Update total points
        UPDATE UnionCatolica.clubs SET total_points = non_sub12_points + sub12_bonus WHERE id = club_id_to_update;
    ELSE
        -- Update total points without Sub12 bonus
        UPDATE UnionCatolica.clubs SET total_points = non_sub12_points WHERE id = club_id_to_update;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update general points after team_stats is updated
CREATE OR REPLACE FUNCTION update_general_points_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_general_points(NEW.club_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_general_points_trigger
AFTER UPDATE OR INSERT ON UnionCatolica.team_stats
FOR EACH ROW
EXECUTE FUNCTION update_general_points_trigger();


-- Consider adding constraints, further indexes based on query patterns.





--select * from UnionCatolica.clubs;

-- Tabla para almacenar la información de los usuarios
CREATE TABLE UnionCatolica.usuarios (
    id SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
    correo_electronico VARCHAR(100) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL, -- Almacena el hash de la contraseña
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla para definir los roles de usuario (ej. 'administrador', 'usuario')
CREATE TABLE UnionCatolica.roles (
    id SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) UNIQUE NOT NULL
);

-- Tabla para definir los permisos (ej. 'crear_jugador', 'editar_partido')
CREATE TABLE UnionCatolica.permisos (
    id SERIAL PRIMARY KEY,
    nombre_permiso VARCHAR(50) UNIQUE NOT NULL
);

-- Tabla de unión para relacionar usuarios con roles (un usuario puede tener varios roles)
CREATE TABLE UnionCatolica.usuario_rol (
    usuario_id INTEGER REFERENCES UnionCatolica.usuarios(id) ON DELETE CASCADE,
    rol_id INTEGER REFERENCES UnionCatolica.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, rol_id)
);

-- Tabla de unión para relacionar roles con permisos (un rol tiene varios permisos)
CREATE TABLE UnionCatolica.rol_permiso (
    rol_id INTEGER REFERENCES UnionCatolica.roles(id) ON DELETE CASCADE,
    permiso_id INTEGER REFERENCES UnionCatolica.permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

-- Índices para mejorar el rendimiento de las búsquedas
CREATE INDEX idx_usuarios_nombre_usuario ON UnionCatolica.usuarios(nombre_usuario);
CREATE INDEX idx_usuarios_correo_electronico ON UnionCatolica.usuarios(correo_electronico);
CREATE INDEX idx_usuario_rol_usuario_id ON UnionCatolica.usuario_rol(usuario_id);
CREATE INDEX idx_usuario_rol_rol_id ON UnionCatolica.usuario_rol(rol_id);
CREATE INDEX idx_rol_permiso_rol_id ON UnionCatolica.rol_permiso(rol_id);
CREATE INDEX idx_rol_permiso_permiso_id ON UnionCatolica.rol_permiso(permiso_id);


-- Insertar roles de ejemplo
INSERT INTO UnionCatolica.roles (nombre_rol) VALUES
('administrador'),
('gerente'),
('entrenador'),
('jugador'),
('aficionado');

-- Insertar permisos de ejemplo
INSERT INTO UnionCatolica.permisos (nombre_permiso) VALUES
('crear_usuario'),
('editar_usuario'),
('eliminar_usuario'),
('ver_usuarios'),
('crear_club'),
('editar_club'),
('eliminar_club'),
('ver_clubes'),
('crear_jugador'),
('editar_jugador'),
('eliminar_jugador'),
('ver_jugadores'),
('ingresar_resultado'),
('ver_resultados'),
('gestionar_sanciones'),
('ver_sanciones'),
('ver_tabla_posiciones');

-- Insertar usuarios de ejemplo (las contraseñas son hashes ficticios)
INSERT INTO UnionCatolica.usuarios (nombre_usuario, correo_electronico, contrasena_hash) VALUES
('alexis', 'mktriox25@gmail.com', 'admin'),
('maria_rodriguez', 'maria.r@example.com', 'hash_maria_2'),
('juan_perez', 'juan.p@example.com', 'hash_juan_3'),
('ana_gomez', 'ana.g@example.com', 'hash_ana_4'),
('luis_fernandez', 'luis.f@example.com', 'hash_luis_5'),
('sofia_diaz', 'sofia.d@example.com', 'hash_sofia_6');


-- Asignar roles a usuarios de ejemplo
-- admin_total es administrador y gerente
INSERT INTO UnionCatolica.usuario_rol (usuario_id, rol_id) VALUES
((SELECT id FROM UnionCatolica.usuarios WHERE nombre_usuario = 'alexis'), (SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador')),
((SELECT id FROM UnionCatolica.usuarios WHERE nombre_usuario = 'alexis'), (SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'));

-- maria_rodriguez es gerente
INSERT INTO UnionCatolica.usuario_rol (usuario_id, rol_id) VALUES
((SELECT id FROM UnionCatolica.usuarios WHERE nombre_usuario = 'maria_rodriguez'), (SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'));

-- juan_perez es entrenador
INSERT INTO UnionCatolica.usuario_rol (usuario_id, rol_id) VALUES
((SELECT id FROM UnionCatolica.usuarios WHERE nombre_usuario = 'juan_perez'), (SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'entrenador'));

-- ana_gomez y luis_fernandez son jugadores
INSERT INTO UnionCatolica.usuario_rol (usuario_id, rol_id) VALUES
((SELECT id FROM UnionCatolica.usuarios WHERE nombre_usuario = 'ana_gomez'), (SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'jugador')),
((SELECT id FROM UnionCatolica.usuarios WHERE nombre_usuario = 'luis_fernandez'), (SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'jugador'));

-- sofia_diaz es aficionado
INSERT INTO UnionCatolica.usuario_rol (usuario_id, rol_id) VALUES
((SELECT id FROM UnionCatolica.usuarios WHERE nombre_usuario = 'sofia_diaz'), (SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'aficionado'));


-- Asignar permisos a roles de ejemplo
-- El administrador tiene todos los permisos (o la mayoría)
INSERT INTO UnionCatolica.rol_permiso (rol_id, permiso_id) VALUES
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'crear_usuario')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'editar_usuario')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'eliminar_usuario')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_usuarios')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'crear_club')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'editar_club')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'eliminar_club')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_clubes')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'crear_jugador')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'editar_jugador')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'eliminar_jugador')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_jugadores')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ingresar_resultado')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_resultados')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'gestionar_sanciones')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_sanciones')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'administrador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_tabla_posiciones'));

-- El gerente puede gestionar clubes, jugadores y ver todo lo relacionado con ellos, resultados y tabla
INSERT INTO UnionCatolica.rol_permiso (rol_id, permiso_id) VALUES
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'crear_club')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'editar_club')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_clubes')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'crear_jugador')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'editar_jugador')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_jugadores')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ingresar_resultado')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_resultados')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'gerente'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_tabla_posiciones'));

-- El entrenador puede ver jugadores, ingresar resultados y ver resultados
INSERT INTO UnionCatolica.rol_permiso (rol_id, permiso_id) VALUES
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'entrenador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_jugadores')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'entrenador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ingresar_resultado')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'entrenador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_resultados')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'entrenador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_tabla_posiciones'));

-- El jugador solo puede ver jugadores, resultados y tabla
INSERT INTO UnionCatolica.rol_permiso (rol_id, permiso_id) VALUES
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'jugador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_jugadores')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'jugador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_resultados')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'jugador'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_tabla_posiciones'));

-- El aficionado solo puede ver resultados y tabla
INSERT INTO UnionCatolica.rol_permiso (rol_id, permiso_id) VALUES
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'aficionado'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_resultados')),
((SELECT id FROM UnionCatolica.roles WHERE nombre_rol = 'aficionado'), (SELECT id FROM UnionCatolica.permisos WHERE nombre_permiso = 'ver_tabla_posiciones'));
