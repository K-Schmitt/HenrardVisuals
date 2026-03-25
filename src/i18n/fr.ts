const fr = {
  nav: {
    home: 'Accueil',
  },
  footer: {
    tagline: "L'essentiel, sans démonstration - l'image au service de l'art.",
    rights: 'Tous droits réservés.',
    createdBy: 'Site créé par',
  },
  gallery: {
    all: 'Tout',
    retry: 'Réessayer',
    empty: 'Aucune photo trouvée',
  },
  notFound: {
    message: 'Page non trouvée',
    back: "Retour à l'accueil →",
  },
  contact: {
    tagline: 'Travaillons ensemble',
    description:
      "Pour toute demande de collaboration, projet photographique ou booking, n'hésitez pas à me contacter.",
    responseTime: 'Réponse sous 24-48h',
  },
  admin: {
    accountSettings: {
      changePassword: 'Changer le mot de passe',
      newPassword: 'Nouveau mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      updatePassword: 'Mettre à jour le mot de passe',
      changeEmail: "Changer l'adresse email",
      newEmail: 'Nouvelle adresse email',
      updateEmail: "Mettre à jour l'email",
      saving: 'Enregistrement…',
      passwordMismatch: 'Les mots de passe ne correspondent pas.',
      passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères.',
      passwordSuccess: 'Mot de passe mis à jour avec succès.',
      invalidEmail: 'Adresse email invalide.',
      emailSuccess: 'Un email de confirmation a été envoyé à votre nouvelle adresse.',
      updateError: 'Erreur lors de la mise à jour.',
    },
  },
} as const;

export default fr;
