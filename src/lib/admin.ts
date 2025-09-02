// Admin configuration
export const ADMIN_EMAIL = 'martin@homeowner-support.com'

export function isAdminUser(email: string | undefined): boolean {
  return email === ADMIN_EMAIL
}