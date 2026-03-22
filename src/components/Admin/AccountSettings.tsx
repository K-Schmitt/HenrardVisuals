import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function AccountSettings() {
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [emailForm, setEmailForm] = useState({ newEmail: '' });
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' });
      return;
    }

    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      setPasswordMsg({ type: 'success', text: 'Mot de passe mis à jour avec succès.' });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour.';
      setPasswordMsg({ type: 'error', text: message });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.newEmail.includes('@')) {
      setEmailMsg({ type: 'error', text: 'Adresse email invalide.' });
      return;
    }

    setSavingEmail(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: emailForm.newEmail });
      if (error) throw error;
      setEmailMsg({
        type: 'success',
        text: 'Un email de confirmation a été envoyé à votre nouvelle adresse.',
      });
      setEmailForm({ newEmail: '' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour.';
      setEmailMsg({ type: 'error', text: message });
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="max-w-lg space-y-10">
      {/* Change password */}
      <section>
        <h2 className="font-serif text-xl text-gray-900 mb-6">Changer le mot de passe</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-elegant text-gray-900 focus:outline-none focus:border-black transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-elegant text-gray-900 focus:outline-none focus:border-black transition-colors"
              placeholder="••••••••"
            />
          </div>

          {passwordMsg && (
            <p
              className={`text-sm px-4 py-3 rounded-elegant ${
                passwordMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {passwordMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={savingPassword}
            className="px-6 py-2.5 bg-black text-white rounded-elegant hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPassword ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </section>

      <hr className="border-gray-200" />

      {/* Change email */}
      <section>
        <h2 className="font-serif text-xl text-gray-900 mb-6">Changer l'adresse email</h2>
        <form onSubmit={handleEmailChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouvelle adresse email
            </label>
            <input
              type="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm({ newEmail: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-elegant text-gray-900 focus:outline-none focus:border-black transition-colors"
              placeholder="nouvelle@adresse.com"
            />
          </div>

          {emailMsg && (
            <p
              className={`text-sm px-4 py-3 rounded-elegant ${
                emailMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {emailMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={savingEmail}
            className="px-6 py-2.5 bg-black text-white rounded-elegant hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingEmail ? 'Enregistrement…' : "Mettre à jour l'email"}
          </button>
        </form>
      </section>
    </div>
  );
}
