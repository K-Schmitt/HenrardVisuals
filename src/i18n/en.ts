const en = {
  nav: {
    home: 'Home',
  },
  footer: {
    tagline: 'The essential, without demonstration - the image at the service of art.',
    rights: 'All rights reserved.',
    createdBy: 'Website created by',
  },
  gallery: {
    all: 'All',
    retry: 'Retry',
    empty: 'No photos found',
  },
  notFound: {
    message: 'Page not found',
    back: 'Go back home →',
  },
  admin: {
    accountSettings: {
      changePassword: 'Change password',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      updatePassword: 'Update password',
      changeEmail: 'Change email address',
      newEmail: 'New email address',
      updateEmail: 'Update email',
      saving: 'Saving…',
      passwordMismatch: 'Passwords do not match.',
      passwordTooShort: 'Password must be at least 8 characters.',
      passwordSuccess: 'Password updated successfully.',
      invalidEmail: 'Invalid email address.',
      emailSuccess: 'A confirmation email has been sent to your new address.',
      updateError: 'Error while updating.',
    },
  },
  contact: {
    tagline: "Let's work together",
    description:
      'For any collaboration request, photography project, or booking inquiry, feel free to reach out.',
    responseTime: 'Response within 24-48h',
  },
} as const;

export default en;
