import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function generateAvatarInitials(name: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(' ');
  if (parts.length >= 2) {
    // First letter of first name and first letter of surname
    return `${parts[0]?.[0] || ''}${parts[parts.length - 1]?.[0] || ''}`.toUpperCase();
  }
  // If no surname, just return the first letter
  return trimmed.substring(0, 1).toUpperCase();
}
