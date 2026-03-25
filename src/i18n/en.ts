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
  contact: {
    tagline: "Let's work together",
    description:
      'For any collaboration request, photography project, or booking inquiry, feel free to reach out.',
    responseTime: 'Response within 24-48h',
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
    profileSettings: {
      headerInfo: 'Header Info',
      modelStats: 'Model Stats',
      biography: 'Biography',
      value: 'Value',
      unit: 'Unit',
      saveChanges: 'Save Changes',
      saving: 'Saving…',
      saveSuccess: 'Settings saved successfully',
      saveError: 'Failed to save settings',
      loadError: 'Failed to load settings',
    },
    categories: {
      title: 'Categories',
      new: 'New Category',
      nameRequired: 'Category name is required',
      createSuccess: 'Category created successfully',
      updateSuccess: 'Category updated successfully',
      saveError: 'Failed to save category',
      deleteSuccess: 'Category deleted successfully',
      deleteError: 'Failed to delete category',
      loadError: 'Failed to load categories',
      empty: 'No categories yet',
      emptyHint: 'Create your first category to organize your portfolio',
      order: 'Order',
      confirmDelete: 'Confirm',
      cancelDelete: 'Cancel',
    },
    photos: {
      uploadTitle: 'Upload Photos',
      countLabel: 'Your Photos',
      empty: 'No photos yet. Upload your first photo above!',
    },
  },
} as const;

export default en;
