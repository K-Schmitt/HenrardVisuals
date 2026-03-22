-- =========================================
-- HenrardVisuals - Créer l'utilisateur Admin
-- =========================================
-- Usage:
--   psql -v ADMIN_EMAIL='admin@example.com' \
--        -v ADMIN_PASSWORD='your_secure_password' \
--        -f create-admin-user.sql
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
    :'ADMIN_EMAIL',
    crypt(:'ADMIN_PASSWORD', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}',
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
    (SELECT id FROM auth.users WHERE email = :'ADMIN_EMAIL')::text,
    (SELECT id FROM auth.users WHERE email = :'ADMIN_EMAIL'),
    jsonb_build_object(
        'sub', (SELECT id FROM auth.users WHERE email = :'ADMIN_EMAIL')::text,
        'email', :'ADMIN_EMAIL'
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
);
