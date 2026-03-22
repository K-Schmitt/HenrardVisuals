-- =========================================
-- Créer l'utilisateur Admin
-- Remplace EMAIL et PASSWORD par tes valeurs
-- =========================================

-- Insérer l'utilisateur dans auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@henrardvisuals.com',  -- ⚠️ Change l'email si besoin
    crypt('Admin123!', gen_salt('bf')),  -- ⚠️ Change le mot de passe ici
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Créer l'identité associée
INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'admin@henrardvisuals.com')::text,
    (SELECT id FROM auth.users WHERE email = 'admin@henrardvisuals.com'),
    jsonb_build_object('sub', (SELECT id FROM auth.users WHERE email = 'admin@henrardvisuals.com')::text, 'email', 'admin@henrardvisuals.com'),
    'email',
    NOW(),
    NOW(),
    NOW()
);

-- =========================================
-- ✅ Utilisateur créé !
-- Email: admin@henrardvisuals.com
-- Password: Admin123!
-- =========================================
